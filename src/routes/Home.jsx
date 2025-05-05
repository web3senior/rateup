import { useState, useRef, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Metadata from '../assets/metadata.json'
import { useUpProvider } from '../contexts/UpProvider'
import { PinataSDK } from 'pinata'
import ABI from '../abi/rateup.json'
import Coin from './../assets/coin.svg'
import DefaultPFP from './../assets/default-pfp.svg'
import ConnectArrow from './../assets/connect-arrow.svg'
import Aratta from './../assets/aratta.svg'
import MaterialIcon from './../helper/MaterialIcon'
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
  const [endorsements, setEndorsements] = useState()
  const [endorsementOptions, setEndorsementOptions] = useState()

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

  const getEndorsementOptions = async () => await contractReadonly.methods.getEndorsementOptions().call()
  const getEndorsements = async (addr) => await contractReadonly.methods.getEndorsements(addr).call()
  const getSwipePrice = async () => await contractReadonly.methods.swipePrice().call()
  const getWhitelist = async (addr) => await contractReadonly.methods.getWhitelist(addr).call()
  const getSwipePool = async (tokenId) => await contractReadonly.methods.swipePool(tokenId).call()
  const getTokenIdsOf = async (addr) => await contractReadonly.methods.tokenIdsOf(addr).call()

  const submitRate = async (e) => {
    e.preventDefault()
    e.target.disabled = true
    const web3 = new Web3(auth.provider)
    const contract = new web3.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)

    const t = toast.loading(`Waiting for transaction's confirmation`)
    const formData = new FormData(e.target)
    const option = formData.get('option')
    const message = formData.get('message')
    const score = formData.get('score')

    try {
      contract.methods
        .giveEndorsement(auth.contextAccounts[0], option, message, score)
        .send({
          from: auth.accounts[0],
        })
        .then((res) => {
          console.log(res)
          toast.success(`Done`)
          toast.dismiss(t)
          e.target.disabled = false

          // Refetch info
          getEndorsements(auth.contextAccounts[0]).then((res) => {
            console.log(res)
            setEndorsements(res)
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

    getEndorsementOptions().then((res) => {
      console.log(res)
      setEndorsementOptions(res)
    })

    getEndorsements(auth.contextAccounts[0]).then((res) => {
      console.log(res)
      setEndorsements(res)
    })

    auth.accounts[0] === auth.contextAccounts[0] ? setUserType(`owner`) : setUserType(`visitor`)
  }, [])

  return (
    <>
      <div className={`${styles.page}`}>
        <Toaster />

        {auth.walletConnected && <Profile addr={auth.contextAccounts[0]} />}

        {!auth.walletConnected && (
          <figure className={`${styles.connectWallet}`}>
            <img src={ConnectArrow} />
          </figure>
        )}
        <main className={`${styles.main}`}>
          <div className={`__container`} data-width={`small`}>
            {endorsements && endorsements.length > 0 && <Score endorsements={endorsements} />}

            <form onSubmit={(e) => submitRate(e)} className={`form d-flex flex-column`} style={{ rowGap: '1rem' }}>
              <select name={`option`}>
                {endorsementOptions &&
                  endorsementOptions.length > 0 &&
                  endorsementOptions.map((item, i) => (
                    <option key={i} value={item}>
                      {item}
                    </option>
                  ))}
              </select>

              <div>
                <label htmlFor="">Message</label>
                <textarea type="text" name="message" placeholder="Message" />
              </div>

              <label htmlFor="">Score</label>
              <select name={`score`}>
                <option value={1}>⭐</option>
                <option value={2}>⭐⭐</option>
                <option value={3}>⭐⭐⭐</option>
                <option value={4}>⭐⭐⭐⭐</option>
                <option value={5}>⭐⭐⭐⭐⭐</option>
              </select>

              <button className="mt-20 btn" type="submit">
                Submit
              </button>
            </form>

            <div className={`${styles.action} d-f-c flex-row w-100`}>
              {auth.walletConnected && userType === 'owner' && (
                <button onClick={(e) => navigate(`deposit`)} disabled={!auth.walletConnected}>
                  View profiles
                </button>
              )}
            </div>
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
const Score = ({ endorsements }) => {
  const [icon, setIcon] = useState([`☺`, `▲`, `□`])
  const [badge, setBadge] = useState()
  const web3Readonly = new Web3(import.meta.env.VITE_LUKSO_PROVIDER)
  function getRandomColor() {
    // Generate random values for Red, Green, and Blue (0-255)
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)

    // Return the color in RGB format
    return `rgb(${r}, ${g}, ${b})`
  }
  let newObject = []

  endorsements.map((obj, i) => {
    obj.counter = 1
    obj.score = web3Readonly.utils.toNumber(obj.score)

    let hasFound = false
    newObject.map((item, i) => {
      if (item.option === obj.option) {
        newObject[i].counter += 1
        newObject[i].score = web3Readonly.utils.toNumber(newObject[i].score) + web3Readonly.utils.toNumber(obj.score)
        hasFound = true
      }
    })

    if (!hasFound) newObject.push(obj)
  })

  console.log(newObject)

  const Star = ({ score, i }) => {
    console.log(score)
    let badges = []
    for (let index = 0; index < score; index++) {
      badges.push(<span>{icon[i]}</span>)
    }
    return <div style={{ color: `${getRandomColor()}`, fontSize: `24px` }}>{badges}</div>
  }

  useEffect(() => {}, [])

  //if (!badge) return <>reading...</>

  return (
    <>
      {newObject.map((item, i) => (
        <div key={i} className={`card`}>
          <div className={`card__body d-flex align-items-center justify-content-between`}>
            <div>
              <b>
                {item.option} ({item.counter})
              </b>
            </div>
            <span>
              <Star score={Math.round(item.score / item.counter)} i={i} />
            </span>
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * Profile
 * @param {String} addr
 * @returns
 */
const test = ({ addr }) => {
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
    description
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
    <div className={`__container`} data-width={`small`}>
      <figure className={`${styles.pfp} d-f-c flex-column grid--gap-050`}>
        <img
          alt={data.data.search_profiles[0].fullName}
          src={`${data.data.search_profiles[0].profileImages.length > 0 ? data.data.search_profiles[0].profileImages[0].src : 'https://ipfs.io/ipfs/bafkreiatl2iuudjiq354ic567bxd7jzhrixf5fh5e6x6uhdvl7xfrwxwzm'}`}
          className={`rounded`}
        />
        <figcaption>@{data.data.search_profiles[0].name}</figcaption>
      </figure>
      <div className={`text-center text-dark`}>
        <div className={`card__body`} style={{ padding: `0rem` }}>
          <small>{data.data.search_profiles[0].description}</small>
        </div>
      </div>
    </div>
  )
}

export default Home
