import { useState, useRef, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Metadata from '../assets/metadata.json'
import { useUpProvider } from '../contexts/UpProvider'
import { PinataSDK } from 'pinata'
import ABI from '../abi/MiniReward.json'
import ABILSP7 from '../abi/lsp7.json'
import Coin from './../assets/coin.svg'
import PpageLogo from './../assets/upage.svg'
import DracosEyes from './../assets/dracos-eyes.png'

import Default from './../assets/default.png'
import moment from 'moment'
import IconSwipe from './../assets/icon-swipe.svg'
import IconLike from './../assets/icon-like.svg'
import IconDownload from './../assets/icon-download.svg'
import IconView from './../assets/icon-view.svg'

import Web3 from 'web3'
import styles from './Deposit.module.scss'
import { useNavigate } from 'react-router'
import { deploylessCallViaFactoryBytecode } from 'viem'

const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_API_KEY,
  pinataGateway: 'example-gateway.mypinata.cloud',
})

function Deposit() {
  const [userType, setUserType] = useState()
  const [status, setStatus] = useState()
  const [reward, setReward] = useState()
  const [rewardTokenAddress, setRewardTokenAddress] = useState()
  const [totalAmount, setTotalAmount] = useState()
  const [rewardAmount, setRewardAmount] = useState()
  const [claimInterval, setClaimInterval] = useState()
  const [lsp7list, setLsp7list] = useState([])
  const [tokenDetails, setTokenDetails] = useState()

  const canvasRef = useRef()
  const navigate = useNavigate()

  const auth = useUpProvider()

  const web3Readonly = new Web3(auth.provider)
  const _ = web3Readonly.utils
  const contractReadonly = new web3Readonly.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)

  const download = (url) => {
    //const htmlStr = SVG.current.outerHTML
    // const blob = new Blob([htmlStr], { type: 'image/svg+xml' })
    // const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    //  return
    //   const a = document.createElement('a')
    // a.setAttribute('download')

    //   a.setAttribute('href', url)
    //   a.style.display = 'none'
    //   document.body.appendChild(a)
    //   a.click()
    //   a.remove()
    // URL.revokeObjectURL(url)
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const rAsset = async (cid) => {
    const assetBuffer = await fetch(`${cid}`, {
      mode: 'cors',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }).then(async (response) => {
      return response.arrayBuffer().then((buffer) => new Uint8Array(buffer))
    })

    return assetBuffer
  }

  const upload = async () => {
    const htmlStr = document.querySelector(`.${styles['board']} svg`).outerHTML
    const blob = new Blob([htmlStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    try {
      const t = toast.loading(`Uploading`)
      const file = new File([blob], 'test.svg', { type: blob.type })
      const upload = await pinata.upload.file(file)
      // console.log(upload)
      toast.dismiss(t)
      return [upload.IpfsHash, url]
    } catch (error) {
      console.log(error)
    }
  }

  const getReward = async (addr) => await contractReadonly.methods.rewards(addr).call()
  const getMintPrice = async () => await contractReadonly.methods.mintPrice().call()
  const getSwipePrice = async () => await contractReadonly.methods.swipePrice().call()
  const getWhitelist = async (addr) => await contractReadonly.methods.getWhitelist(addr).call()
  const getSwipePool = async (tokenId) => await contractReadonly.methods.swipePool(tokenId).call()
  const getTokenIdsOf = async (addr) => await contractReadonly.methods.tokenIdsOf(addr).call()

  const deposit = async (e) => {
    //  e.target.disabled = true
    const web3 = new Web3(auth.provider)
    const contract = new web3.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)
    const lsp7Contract = new web3.eth.Contract(ABILSP7, rewardTokenAddress)

    const approveToast = toast.loading(`Waiting for approving`)

    const lsp7 = await get_lsp7(rewardTokenAddress)

    const totalAmountWei = lsp7.data.Asset[0].decimals === 0 ? totalAmount : web3.utils.toWei(totalAmount, `ether`)
    const rewardAmountWei = lsp7.data.Asset[0].decimals === 0 ? totalAmount : web3.utils.toWei(rewardAmount, `ether`)

    try {
      lsp7Contract.methods
        .authorizeOperator(import.meta.env.VITE_CONTRACT, totalAmountWei, '0x')
        .send({ from: auth.accounts[0] })
        .then((res) => {
          toast.dismiss(approveToast)

          const t = toast.loading(`Waiting for transaction's confirmation`)
          contract.methods
            .giveReward(rewardTokenAddress, totalAmountWei, rewardAmountWei, claimInterval)
            .send({
              from: auth.accounts[0],
              value: 0,
            })
            .then((res) => {
              console.log(res)
              toast.success(`Done`)
              toast.dismiss(t)
              e.target.disabled = false
              window.location.reload()
            })
            .catch((error) => {
              console.log(error)
              toast.dismiss(t)
            })
        })
    } catch (error) {
      console.log(error)
      toast.dismiss(approveToast)
    }
  }

  const stopWithdraw = async (e) => {
    e.target.disabled = true
    const web3 = new Web3(auth.provider)
    const contract = new web3.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)
    const lsp7Contract = new web3.eth.Contract(ABILSP7, rewardTokenAddress)

    const t = toast.loading(`Waiting for transaction's confirmation`)
    try {
      contract.methods
        .transferLSP7('0x')
        .send({
          from: auth.accounts[0],
          value: 0,
        })
        .then((res) => {
          console.log(res)
          toast.success(`Done`)
          toast.dismiss(t)
          e.target.disabled = false
          window.location.reload()
        })
        .catch((error) => {
          console.log(error)
          toast.dismiss(t)
        })
    } catch (error) {
      console.log(error)
      toast.dismiss(t)
    }
  }

  const pause = async (e) => {
    e.target.disabled = true
    const web3 = new Web3(auth.provider)
    const contract = new web3.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)

    try {
      const t = toast.loading(`Waiting for transaction's confirmation`)
      contract.methods
        .setClaimingStatus(!reward.isClaimingEnabled)
        .send({
          from: auth.accounts[0],
          value: 0,
        })
        .then((res) => {
          console.log(res)
          toast.success(`Done`)
          toast.dismiss(t)
          e.target.disabled = false

          getReward(auth.contextAccounts[0]).then((res) => {
            console.log(res)
            setReward(res)
          })
        })
        .catch((error) => {
          console.log(error)
          toast.dismiss(t)
        })
    } catch (error) {
      console.log(error)
      toast.dismiss(t)
    }
  }

  const fetchData = async (dataURL) => {
    let requestOptions = {
      method: 'GET',
      redirect: 'follow',
    }
    const response = await fetch(`${dataURL}`, requestOptions)
    if (!response.ok) throw new Response('Failed to get data', { status: 500 })
    return response.json()
  }

  const getDataForTokenId = async (tokenId) => await contractReadonly.methods.getDataForTokenId(`${tokenId}`, '0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e').call()

  const getTokenId = async (addr) => {
    console.log(addr)
    // Read connect wallet profile
    // if (auth.walletConnected) {
    //   handleSearchProfile(auth.accounts[0]).then((profile) => {
    //     // console.log(profile)
    //     setProfile(profile)
    //   })

    const tokenId = await getTokenIdsOf(addr)
    console.log(tokenId)
    if (tokenId.length < 1) return

    getDataForTokenId(tokenId[0]).then((data) => {
      data = _.hexToUtf8(data)
      data = data.search(`data:application/json;`) > -1 ? data.slice(data.search(`data:application/json;`), data.length) : `${import.meta.env.VITE_IPFS_GATEWAY}` + data.slice(data.search(`ipfs://`), data.length).replace(`ipfs://`, '')

      fetchData(data).then((dataContent) => {
        // console.log(dataContent)
        dataContent.tokenId = tokenId
        console.log(dataContent)
        setToken(dataContent)
        setActiveMood(dataContent.LSP4Metadata.attributes[0].value)

        if (auth.walletConnected) {
          document.querySelectorAll(`#moodSelector`).forEach((item) => item.setAttribute('data-active', false))
          document.querySelector(`.${dataContent.LSP4Metadata.attributes[0].value.toLowerCase()}`).setAttribute('data-active', true)
        }
        // add the image to canvas
        // var can = document.getElementById('canvas')
        // var ctx = can.getContext('2d')

        // var img = new Image()
        // img.onload = function () {
        //   ctx.drawImage(img, 0, 0, can.width, can.height)
        // }
        // img.crossOrigin = `anonymous`
        // img.src = `${import.meta.env.VITE_IPFS_GATEWAY}${dataContent.LSP4Metadata.images[0][0].url.replace('ipfs://', '').replace('://', '')}`
      })
    })
  }

  const downloadCanvas = function (tokenId) {
    const link = document.createElement('a')
    link.download = `${tokenId}.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
    link.remove()
  }

  async function get_lsp7(contract) {
    console.log(contract)
    let myHeaders = new Headers()
    myHeaders.append('Content-Type', `application/json`)
    myHeaders.append('Accept', `application/json`)

    let requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify({
        query: `query MyQuery {
  Asset(where: {id: {_eq: "${contract}"}}) {
    id
    isLSP7
    lsp4TokenName
    lsp4TokenSymbol
    lsp4TokenType
    name
    decimals
    totalSupply
    owner_id
    icons {
      id
      src
      url
    }
    transfers(order_by: {blockNumber: desc}, limit: 5) {
      value
      transaction_id
      from {
        id
        fullName
        profileImages {
          src
        }
        isEOA
      }
      to {
        id
        fullName
        profileImages {
          src
        }
        isEOA
      }
    }
    holders(order_by: {balance: desc}, limit: 100) {
      balance
      profile {
        name
        fullName
        id
        isEOA
        isContract
        profileImages {
          src
        }
        tags
      }
    }
  }
}`,
      }),
    }

    const response = await fetch(`${import.meta.env.VITE_PUBLIC_API_ENDPOINT}`, requestOptions)
    if (!response.ok) {
      return { result: false, message: `Failed to fetch query` }
    }
    const data = await response.json()
    return data
  }

  async function searchLSP7(e) {
    const q = e.target.value

    setStatus(`searching`)

    let myHeaders = new Headers()
    myHeaders.append('Content-Type', `application/json`)
    myHeaders.append('Accept', `application/json`)

    let requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify({
        query: `query MyQuery {
  Asset(
    where: {lsp4TokenName: {_ilike: "%${q}%"}, isLSP7: {_eq: true}}
    limit: 15
    order_by: {holders_aggregate: {count: desc}}
  ) {
    id
    isLSP7
    lsp4TokenName
    lsp4TokenSymbol
    decimals
    lsp4TokenType
    name
    totalSupply
    owner_id
    holders_aggregate {
      aggregate {
        count
      }
    }
  }
}`,
      }),
    }

    const response = await fetch(`${import.meta.env.VITE_PUBLIC_API_ENDPOINT}`, requestOptions)
    if (!response.ok) {
      return { result: false, message: `Failed to fetch query` }
    }
    const data = await response.json()
    setStatus(``)
    console.log(data)
    if (data.data.Asset.length > 0) setLsp7list(data.data.Asset)
  }

  useEffect(() => {
    console.clear()

    getReward(auth.contextAccounts[0]).then((res) => {
      console.log(res)
      setReward(res)

      if (res.rewardTokenAddress !== `0x0000000000000000000000000000000000000000`) {
        get_lsp7(res.rewardTokenAddress.toLowerCase()).then(async (res) => {
          console.log(res)
          setTokenDetails(res)

          const svg = document.querySelector('svg g#logo')
          const svgns = 'http://www.w3.org/2000/svg'
          const gRef = document.createElementNS(svgns, 'g')

          const image = document.createElementNS(svgns, 'image')
          image.setAttribute('href', `${res.data.Asset[0].icons[0].src}`)
          image.setAttribute('width', 140)
          image.setAttribute('height', 140)
          image.setAttribute('x', 5)
          image.setAttribute('y', 50)

          gRef.appendChild(image)

          svg.appendChild(gRef)
        })
      }
    })

    auth.accounts[0] === auth.contextAccounts[0] ? setUserType(`owner`) : setUserType(`visitor`)
  }, [])

  return (
    <>
      <div className={`${styles.page}`}>
        <Toaster />

        <main className={`${styles.main}`}>
          <div className={`__container`} data-width={`medium`}>
            {reward && (
              <div className={`d-flex align-items-center justify-content-between`}>
                <ul className={`d-flex flex-column mb-20`}>
                  <li>
                    <span>Reward Token Address: </span>
                    <a href={`https://universaleverything.io/asset/${reward.rewardTokenAddress}`} target={`_blank`} title={reward.rewardTokenAddress}>
                      View
                    </a>
                  </li>
                  <li>
                    <span>Total amount: </span>
                    <b>{new Intl.NumberFormat({ maximumSignificantDigits: 3 }).format(web3Readonly.utils.fromWei(_.toNumber(reward.totalAmount), `ether`))}</b>
                  </li>
                  <li>
                    <span>Reward Amount: </span>
                    <b>{new Intl.NumberFormat({ maximumSignificantDigits: 3 }).format(web3Readonly.utils.fromWei(_.toNumber(reward.rewardAmount), `ether`))}</b>
                  </li>
                  <li>
                    <span>Remainder Amount: </span>
                    <b>{new Intl.NumberFormat({ maximumSignificantDigits: 3 }).format(web3Readonly.utils.fromWei(_.toNumber(reward.remainderAmount), `ether`))}</b>
                  </li>
                  <li>
                    <span>Claiming Stauts: </span>
                    {reward.isClaimingEnabled ? <span className={`badge badge-pill badge-success`}>Active</span> : <span className={`badge badge-pill badge-danger`}>Paused</span>}
                  </li>
                </ul>

                <svg width="151" height="216" viewBox="0 0 151 216" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g id={`logo`}></g>
                  <path
                    d="M143.365 46.2388C136.229 33.8852 120.789 32.3623 118.704 30.0955C116.954 27.5015 115.858 24.5233 115.509 21.4126L30.3352 21.1772C30.3352 21.1772 30.8762 29.2056 26.9972 31.9025C23.2103 34.5533 6.43946 36.7471 3.32333 57.5131C0.142292 78.7742 -7.43704 199.962 21.3222 209.506C50.0815 219.049 125.488 219.536 140.449 199.987C155.41 180.438 152.651 62.3307 143.365 46.2388ZM137.401 195.794H137.406C123.164 214.477 51.2987 214.017 23.873 204.888C-3.5527 195.759 3.6831 79.9265 6.7289 59.6203C9.69084 39.7631 27.2677 35.4865 30.8708 32.9655C30.8708 32.9655 38.2824 30.155 73.3713 29.9332C98.8494 29.7709 113.234 31.8754 120.906 34.2179C126.708 36.9472 135.269 40.3257 140.173 48.8302C149.032 64.2242 151.659 177.103 137.401 195.794Z"
                    fill="#88C9F2"
                    fill-opacity="0.5"
                  />
                  <path
                    d="M24.9182 4.87007C21.187 7.69677 20.3449 25.371 21.7553 26.5642C26.1144 30.2508 109.785 31.2208 122.552 26.8618C126.67 25.4603 120.312 5.14084 115.727 3.23951C113.135 2.16834 91.896 0.299755 70.916 0.0200552C49.4807 -0.256659 28.2061 2.3796 24.9182 4.87007Z"
                    fill="#FCBB01"
                  />
                  <path
                    d="M24.9182 4.87007C21.187 7.69677 20.3449 25.371 21.7553 26.5642C26.1144 30.2508 109.785 31.2208 122.552 26.8618C126.67 25.4603 120.312 5.14084 115.727 3.23951C113.135 2.16834 91.896 0.299755 70.916 0.0200552C49.4807 -0.256659 28.2061 2.3796 24.9182 4.87007Z"
                    fill="url(#paint0_linear_9215_909)"
                  />
                  <path
                    d="M117.014 4.20369C116.654 3.80498 116.217 3.48364 115.729 3.25453C113.137 2.18335 91.8984 0.314754 70.9183 0.0350659C49.9889 -0.247607 29.2409 2.25773 25.1973 4.69464C56.3088 7.14643 92.431 7.33686 117.014 4.20369Z"
                    fill="#9C2E55"
                    fill-opacity="0.32"
                  />
                  <path
                    d="M140.067 49.0126C148.931 64.3957 151.561 177.296 137.3 195.99C123.039 214.684 51.1764 214.219 23.7453 205.087C-3.68585 195.955 3.55265 80.1035 6.59845 59.7919C8.27283 46.7269 17.9106 36.0882 30.7457 33.1317C39.5261 30.7053 78.6643 27.0861 113.826 32.6989C119.242 33.5645 133.267 37.2027 140.067 49.0126Z"
                    fill="#C9DFF2"
                    fill-opacity="0.2"
                  />

                  <g>
                    <path
                      d="M134.583 174.424C133.507 175.839 132 177.14 130.182 178.306C139.901 155.931 137.589 71.7005 130.631 59.6715C124.975 49.8632 113.349 46.8337 108.862 46.1141C79.6859 41.4697 47.21 44.4776 39.9147 46.4739C36.0764 47.372 32.5518 49.1004 29.5898 51.4565C33.1144 45.419 39.0627 40.9314 46.1767 39.2922C53.4477 37.2959 85.9263 34.2853 115.102 38.9324C119.59 39.652 131.237 42.6788 136.872 52.4654C144.232 65.2356 146.412 158.917 134.583 174.424Z"
                      fill="white"
                    />
                  </g>

                  <defs>
                    <linearGradient id="paint0_linear_9215_909" x1="40.9902" y1="3.49067" x2="51.1332" y2="40.3356" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FBA7C5" />
                      <stop offset="0.452271" stopColor="#FCE1EA" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            <div className={`form d-flex flex-column grid--gap-050 mb-30`}>
              <div className={`form-group`}>
                <input list={`tokens`} type={`text`} placeholder={`Search Reward Token Address`} onChange={(e) => setRewardTokenAddress(e.target.value)} onKeyDown={(e) => searchLSP7(e)} />

                <datalist id="tokens">
                  {lsp7list.length > 0 &&
                    lsp7list.map((item, i) => {
                      return (
                        <option key={i} value={`${item.id}`}>
                          {item.lsp4TokenName} (${item.lsp4TokenSymbol})
                        </option>
                      )
                    })}
                </datalist>
              </div>
              <div className={`form-group`}>
                <input type={`text`} placeholder={`Total Amount`} onChange={(e) => setTotalAmount(e.target.value)} />
              </div>

              <div className={`form-group`}>
                <input type={`text`} placeholder={`Reward Amount`} onChange={(e) => setRewardAmount(e.target.value)} />
              </div>

              <div className={`form-group`}>
                <input type={`text`} placeholder={`Claim Interval`} list="interval" onChange={(e) => setClaimInterval(e.target.value)} />
                <small>This is the time that a visitor has to wait between claiming rewards (based on hours)</small>
                <datalist id={`interval`}>
                  <option value="24" />
                  <option value="48" />
                  <option value="72" />
                </datalist>
              </div>
            </div>

            {auth.walletConnected && (
              <div className={`${styles.action} grid grid--fill`} style={{ '--data-width': `300px` }}>
                <button onClick={(e) => deposit(e)} disabled={rewardTokenAddress === undefined || totalAmount === undefined || rewardAmount === undefined || claimInterval === undefined}>
                  Approve & Deposit
                </button>
                <button onClick={(e) => stopWithdraw(e)}>Stop & Withdraw</button>
                <button onClick={(e) => pause(e)}>{reward && reward.isClaimingEnabled ? `Stop` : `Start`}</button>
                <button onClick={(e) => navigate(`../`)}>Back</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}

export default Deposit
