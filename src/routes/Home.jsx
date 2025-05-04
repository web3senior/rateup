import { useState, useRef, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Metadata from '../assets/metadata.json'
import { useUpProvider } from '../contexts/UpProvider'
import { PinataSDK } from 'pinata'
import ABI from '../abi/MiniReward.json'
import Coin from './../assets/coin.svg'
import DefaultPFP from './../assets/default-pfp.svg'
import ConnectArrow from './../assets/connect-arrow.svg'
import Aratta from './../assets/aratta.svg'

import Default from './../assets/default.png'
import moment from 'moment'

import Web3 from 'web3'
import styles from './Home.module.scss'
import { useNavigate } from 'react-router'

const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_API_KEY,
  pinataGateway: 'example-gateway.mypinata.cloud',
})

function Home() {
  const [userType, setUserType] = useState()
  const [reward, setReward] = useState()
  const [tokenDetails, setTokenDetails] = useState()

  const navigate = useNavigate()

  const auth = useUpProvider()

  const web3Readonly = new Web3(import.meta.env.VITE_LUKSO_PROVIDER)
  const _ = web3Readonly.utils
  const contractReadonly = new web3Readonly.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)

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
  const getHasClaimed = async (hostAddr, visitorAddr) => await contractReadonly.methods.hasClaimed(hostAddr, visitorAddr).call()
  const getSwipePrice = async () => await contractReadonly.methods.swipePrice().call()
  const getWhitelist = async (addr) => await contractReadonly.methods.getWhitelist(addr).call()
  const getSwipePool = async (tokenId) => await contractReadonly.methods.swipePool(tokenId).call()
  const getTokenIdsOf = async (addr) => await contractReadonly.methods.tokenIdsOf(addr).call()

  const claim = async (e) => {
    e.target.disabled = true
    const web3 = new Web3(auth.provider)
    const contract = new web3.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)

    const t = toast.loading(`Waiting for transaction's confirmation`)

    try {
      contract.methods
        .claimReward(auth.contextAccounts[0], '0x')
        .send({
          from: auth.accounts[0],
        })
        .then((res) => {
          console.log(res)
          toast.success(`Done`)
          toast.dismiss(t)
          e.target.disabled = false

          // Refetch info
          getReward(auth.contextAccounts[0]).then((res) => {
            console.log(res)
            setReward(res)

            if (res.rewardTokenAddress !== `0x0000000000000000000000000000000000000000`) {
              get_lsp7(res.rewardTokenAddress).then((res) => {
                console.log(res)
                setTokenDetails(res)
              })
            }
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
  Asset(where: {id: {_eq: "${contract.toLowerCase()}"}}) {
    id
    isLSP7
    lsp4TokenName
    lsp4TokenSymbol
    lsp4TokenType
    name
    totalSupply
    owner_id
    icons {
      id
      src
      url
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

  useEffect(() => {
    console.clear()

    getReward(auth.contextAccounts[0]).then((res) => {
      console.log(res)
      setReward(res)

      if (res.rewardTokenAddress !== `0x0000000000000000000000000000000000000000`) {
        get_lsp7(res.rewardTokenAddress).then((res) => {
          console.log(res)
          setTokenDetails(res)
        })
      }
    })

    auth.accounts[0] === auth.contextAccounts[0] ? setUserType(`owner`) : setUserType(`visitor`)
  }, [])

  return (
    <>
      <div className={`${styles.page}`}>
        <Toaster />

        {auth.walletConnected && <Profile addr={auth.accounts[0]} />}

        {!auth.walletConnected && (
          <figure className={`${styles.connectWallet}`}>
            <img src={ConnectArrow} />
          </figure>
        )}
        <main className={`${styles.main}`}>
          <div className={`__container`} data-width={`small`}>
            <figure className={`d-f-c grid--gap-1`}>
              <img src={Coin} className={`rounded`} style={{ width: `84px` }} alt="" />
              <figcaption>{reward && <>{new Intl.NumberFormat({ maximumSignificantDigits: 3 }).format(web3Readonly.utils.fromWei(_.toNumber(reward.rewardAmount), `ether`))}</>}</figcaption>
            </figure>

            {reward && (
              <>
                <h2>
                  ⚡ {_.toNumber(reward.claimInterval) / 60 / 60}h / {new Intl.NumberFormat({ maximumSignificantDigits: 3 }).format(web3Readonly.utils.fromWei(_.toNumber(reward.rewardAmount), `ether`))}{' '}
                  {tokenDetails && <>${tokenDetails.data.Asset[0].lsp4TokenSymbol}</>}
                </h2>
                {/* _.toNumber(reward.claimInterval) */}
                {auth.walletConnected && <NextClaim />}
              </>
            )}

            {reward && tokenDetails && (
              <div className={`${styles.progressbar}`}>
                <div style={{ '--w': `${(web3Readonly.utils.fromWei(_.toNumber(reward.remainderAmount), `ether`) * 100) / web3Readonly.utils.fromWei(_.toNumber(reward.totalAmount), `ether`)}%` }}>
                  <span>
                    {new Intl.NumberFormat({ maximumSignificantDigits: 3 }).format(web3Readonly.utils.fromWei(_.toNumber(reward.remainderAmount), `ether`))} {tokenDetails && <>${tokenDetails.data.Asset[0].lsp4TokenSymbol}</>}
                  </span>
                </div>
              </div>
            )}

            <div className={`${styles.action} d-f-c flex-row w-100`}>
              <button
                onClick={(e) => claim(e)}
                disabled={!auth.walletConnected}
                //  disabled={reward && reward.rewardTokenAddress === `0x0000000000000000000000000000000000000000`}>
              >
                {reward && reward.isClaimingEnabled ? `Claim` : `Claim (Not Active)`}
              </button>
              {auth.walletConnected && userType === 'owner' && (
                <button onClick={(e) => navigate(`deposit`)} disabled={!auth.walletConnected}>
                  Deposit
                </button>
              )}
            </div>

            <small className={`mt-10`}>In order to claim, you need to follow the profile first!</small>
          </div>

          <figure className={`d-f-c mt-20 ${styles.aratta}`}>
            <img src={Aratta} />
          </figure>
        </main>
      </div>
    </>
  )
}

/**
 * Profile
 * @param {String} addr
 * @returns
 */
const NextClaim = ({ addr }) => {
  const [data, setData] = useState()

  const auth = useUpProvider()

  const web3Readonly = new Web3(import.meta.env.VITE_LUKSO_PROVIDER)
  const _ = web3Readonly.utils
  const contractReadonly = new web3Readonly.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)

  const getHasClaimed = async (hostAddr, visitorAddr) => await contractReadonly.methods.hasClaimed(hostAddr, visitorAddr).call()

  useEffect(() => {
    getHasClaimed(auth.accounts[0], auth.contextAccounts[0]).then((res) => {
      console.log(res)
      setData(res)
    })
  }, [])

  if (!data) return <>reading...</>

  return <small>{auth.walletConnected ? (_.toNumber(data.nextClaim) === 0 ? `Claim Now` : `Next claim: ${moment.unix(_.toNumber(data.nextClaim)).utc().fromNow()}`) : `-`}</small>
}

/**
 * Profile
 * @param {String} addr
 * @returns
 */
const Profile = ({ addr }) => {
  const [data, setData] = useState()

  const getProfile = async (addr) => {
    const myHeaders = new Headers()
    myHeaders.append('Content-Type', `application/json`)
    myHeaders.append('Accept', `application/json`)

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify({
        query: `query MyQuery {
  search_profiles(
    args: {search: "${addr}"}
    limit: 1
  ) {
    fullName
    name
    id
    profileImages {
      src
    }
  }
}`,
      }),
    }
    const response = await fetch(`${import.meta.env.VITE_PUBLIC_API_ENDPOINT}`, requestOptions)
    if (!response.ok) {
      throw new Response('Failed to ', { status: 500 })
    }
    const data = await response.json()
    setData(data)
    return data
  }

  useEffect(() => {
    getProfile(addr).then(console.log)
  }, [])

  if (!data)
    return (
      <>
        <figure className={`${styles.pfp} d-f-c flex-column grid--gap-050`}>
          <img alt={`Default PFP`} src={DefaultPFP} className={`rounded`} />
          <figcaption>@username</figcaption>
        </figure>
      </>
    )

  return (
    <>
      <figure className={`${styles.pfp} d-f-c flex-column grid--gap-050`}>
        <img
          alt={data.data.search_profiles[0].fullName}
          src={`${data.data.search_profiles[0].profileImages.length > 0 ? data.data.search_profiles[0].profileImages[0].src : 'https://ipfs.io/ipfs/bafkreiatl2iuudjiq354ic567bxd7jzhrixf5fh5e6x6uhdvl7xfrwxwzm'}`}
          className={`rounded`}
        />
        <figcaption>@{data.data.search_profiles[0].name}</figcaption>
      </figure>
    </>
  )
}

export default Home
