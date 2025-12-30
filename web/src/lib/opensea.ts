// OpenSea API Types and Helpers
import { getOpenseaChain } from '@/config/chains'
import { batchGetTransactionValues, weiToEth } from '@/lib/alchemy'

export interface OpenSeaNFT {
  identifier: string
  collection: string
  contract: string
  token_standard: 'erc721' | 'erc1155'
  name: string | null
  description: string | null
  image_url: string | null
  display_image_url: string | null
  display_animation_url: string | null
  metadata_url: string | null
  opensea_url: string
  updated_at: string
  is_disabled: boolean
  is_nsfw: boolean
}

export interface OpenSeaPayment {
  quantity: string
  token_address: string
  decimals: number
  symbol: string
}

export interface OpenSeaSaleEvent {
  event_type: 'sale'
  event_timestamp: number
  chain: string
  nft: {
    identifier: string
    collection: string
    contract: string
    token_standard: string
    name: string | null
    image_url: string | null
  }
  quantity: number
  seller: string
  buyer: string
  payment: OpenSeaPayment
  transaction: string
  closing_date: number
}

export interface OpenSeaTransferEvent {
  event_type: 'transfer'
  event_timestamp: number
  chain: string
  nft: {
    identifier: string
    collection: string
    contract: string
    token_standard: string
    name: string | null
    image_url: string | null
  }
  quantity: number
  from_address: string
  to_address: string
  transaction: string
}

export type OpenSeaEvent = OpenSeaSaleEvent | OpenSeaTransferEvent

export interface OpenSeaNFTsResponse {
  nfts: OpenSeaNFT[]
  next: string | null
}

export interface OpenSeaEventsResponse {
  asset_events: OpenSeaEvent[]
  next: string | null
}

// NFT with acquisition info for display
export interface NFTWithAcquisition extends OpenSeaNFT {
  tokenType: 'ERC721' | 'ERC1155'
  acquisitionPrice: string | null // In ETH or token symbol
  acquisitionSymbol: string | null
  acquisitionDate: Date | null
  acquisitionType: 'purchase' | 'transfer' | 'mint' | 'unknown'
  acquisitionTxHash: string | null
}

const OPENSEA_API_KEY = import.meta.env.VITE_OPENSEA_API_KEY || ''
const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2'

/**
 * Fetches all NFTs owned by an address using the OpenSea API.
 */
export async function getNFTsForOwner(
  address: string,
  chainId: number,
  next?: string
): Promise<OpenSeaNFTsResponse> {
  if (!OPENSEA_API_KEY) {
    console.warn('OpenSea API key not set')
    return { nfts: [], next: null }
  }

  const chain = getOpenseaChain(chainId)
  if (!chain) {
    console.warn('Chain not supported by OpenSea API')
    return { nfts: [], next: null }
  }

  try {
    const params = new URLSearchParams({
      limit: '200',
    })

    if (next) {
      params.append('next', next)
    }

    const response = await fetch(
      `${OPENSEA_API_BASE}/chain/${chain}/account/${address}/nfts?${params}`,
      {
        headers: {
          'x-api-key': OPENSEA_API_KEY,
        },
      }
    )

    if (!response.ok) {
      console.error(
        'OpenSea API error:',
        response.status,
        await response.text()
      )
      return { nfts: [], next: null }
    }

    const data = await response.json()

    return {
      nfts: data.nfts || [],
      next: data.next || null,
    }
  } catch (error) {
    console.error('Error fetching NFTs from OpenSea:', error)
    return { nfts: [], next: null }
  }
}

/**
 * Fetches events for an account with pagination.
 */
async function fetchAllAccountEvents(
  address: string,
  chainId: number,
  eventTypes: string[] = ['sale', 'transfer'],
  maxPages: number = 5
): Promise<OpenSeaEvent[]> {
  if (!OPENSEA_API_KEY) {
    return []
  }

  const chain = getOpenseaChain(chainId)
  if (!chain) {
    return []
  }

  const allEvents: OpenSeaEvent[] = []
  let nextCursor: string | null = null
  let pages = 0

  while (pages < maxPages) {
    try {
      const params = new URLSearchParams({
        limit: '200',
        chain: chain,
      })

      for (const eventType of eventTypes) {
        params.append('event_type', eventType)
      }

      if (nextCursor) {
        params.append('next', nextCursor)
      }

      const response = await fetch(
        `${OPENSEA_API_BASE}/events/accounts/${address}?${params}`,
        {
          headers: {
            'x-api-key': OPENSEA_API_KEY,
          },
        }
      )

      if (!response.ok) {
        console.error('OpenSea Events API error:', response.status)
        break
      }

      const data = await response.json()
      const events = data.asset_events || []
      allEvents.push(...events)

      nextCursor = data.next
      pages++

      if (!nextCursor) {
        break
      }
    } catch (error) {
      console.error('Error fetching events from OpenSea:', error)
      break
    }
  }

  return allEvents
}

/**
 * Fetches events for a specific NFT to find acquisition data.
 */
async function fetchNFTEvents(
  chainId: number,
  contractAddress: string,
  tokenId: string
): Promise<OpenSeaEvent[]> {
  if (!OPENSEA_API_KEY) {
    return []
  }

  const chain = getOpenseaChain(chainId)
  if (!chain) {
    return []
  }

  try {
    const params = new URLSearchParams({
      limit: '50',
    })
    params.append('event_type', 'sale')
    params.append('event_type', 'transfer')

    const response = await fetch(
      `${OPENSEA_API_BASE}/events/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}?${params}`,
      {
        headers: {
          'x-api-key': OPENSEA_API_KEY,
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.asset_events || []
  } catch {
    return []
  }
}

type AcquisitionInfo = {
  price: string | null
  symbol: string | null
  date: Date
  type: 'purchase' | 'transfer' | 'mint'
  txHash: string | null
}

/**
 * Process events to find when the user acquired each NFT.
 */
function processEventsForAcquisition(
  events: OpenSeaEvent[],
  ownerAddress: string
): Map<string, AcquisitionInfo> {
  const acquisitionMap = new Map<string, AcquisitionInfo>()

  // Process events - we want the MOST RECENT acquisition event for each NFT
  // (the one that gave the current owner the NFT)
  // Sales always take priority over transfers (they happen together)
  for (const event of events) {
    const nftKey = `${event.nft.contract.toLowerCase()}:${event.nft.identifier}`

    if (event.event_type === 'sale') {
      const saleEvent = event as OpenSeaSaleEvent
      // Count if user is the buyer
      if (saleEvent.buyer.toLowerCase() === ownerAddress.toLowerCase()) {
        const existingAcq = acquisitionMap.get(nftKey)
        const eventDate = new Date(saleEvent.event_timestamp * 1000)

        // Sales always take priority - use if no existing OR existing is not a purchase OR this is more recent
        if (
          !existingAcq ||
          existingAcq.type !== 'purchase' ||
          eventDate > existingAcq.date
        ) {
          // Calculate price in human-readable format
          const priceInUnits =
            Number(saleEvent.payment.quantity) /
            Math.pow(10, saleEvent.payment.decimals)

          acquisitionMap.set(nftKey, {
            price: priceInUnits.toFixed(4),
            symbol: saleEvent.payment.symbol,
            date: eventDate,
            type: 'purchase',
            txHash: saleEvent.transaction || null,
          })
        }
      }
    } else if (event.event_type === 'transfer') {
      const transferEvent = event as OpenSeaTransferEvent
      // Count if user is the recipient
      if (
        transferEvent.to_address.toLowerCase() === ownerAddress.toLowerCase()
      ) {
        const existingAcq = acquisitionMap.get(nftKey)
        const eventDate = new Date(transferEvent.event_timestamp * 1000)

        // Only use transfer if we don't have a purchase event
        // (sales and transfers happen together, sale should win)
        if (
          !existingAcq ||
          (existingAcq.type !== 'purchase' && eventDate > existingAcq.date)
        ) {
          // Check if this is a mint (from zero address)
          const isMint =
            transferEvent.from_address ===
            '0x0000000000000000000000000000000000000000'

          acquisitionMap.set(nftKey, {
            price: null,
            symbol: null,
            date: eventDate,
            type: isMint ? 'mint' : 'transfer',
            txHash: transferEvent.transaction || null,
          })
        }
      }
    }
  }

  return acquisitionMap
}

// Sort priority: purchase (0) > mint (1) > transfer (2) > unknown (3)
function getAcquisitionTypePriority(
  type: NFTWithAcquisition['acquisitionType']
): number {
  switch (type) {
    case 'purchase':
      return 0
    case 'mint':
      return 1
    case 'transfer':
      return 2
    case 'unknown':
      return 3
  }
}

/**
 * Fetches all NFTs and their acquisition data, then merges them.
 */
export async function getNFTsWithAcquisition(
  address: string,
  chainId: number
): Promise<NFTWithAcquisition[]> {
  // Fetch NFTs and account events in parallel
  const [nftsResponse, accountEvents] = await Promise.all([
    getNFTsForOwner(address, chainId),
    fetchAllAccountEvents(address, chainId, ['sale', 'transfer'], 5),
  ])

  // Process account events
  const acquisitionMap = processEventsForAcquisition(accountEvents, address)

  // Find NFTs that don't have acquisition data - we'll fetch their specific events
  const nftsWithoutData = nftsResponse.nfts.filter((nft) => {
    const nftKey = `${nft.contract.toLowerCase()}:${nft.identifier}`
    return !acquisitionMap.has(nftKey)
  })

  // Fetch events for NFTs without data (limit to avoid too many API calls)
  const nftsToFetch = nftsWithoutData.slice(0, 20)
  if (nftsToFetch.length > 0) {
    const nftEventPromises = nftsToFetch.map((nft) =>
      fetchNFTEvents(chainId, nft.contract, nft.identifier)
    )

    const nftEventsResults = await Promise.all(nftEventPromises)

    // Process each NFT's events using the same logic
    for (let i = 0; i < nftsToFetch.length; i++) {
      const nft = nftsToFetch[i]
      const events = nftEventsResults[i]
      const nftKey = `${nft.contract.toLowerCase()}:${nft.identifier}`

      // Process all events for this NFT - sales take priority over transfers
      for (const event of events) {
        if (event.event_type === 'sale') {
          const saleEvent = event as OpenSeaSaleEvent
          if (saleEvent.buyer.toLowerCase() === address.toLowerCase()) {
            const existingAcq = acquisitionMap.get(nftKey)
            const eventDate = new Date(saleEvent.event_timestamp * 1000)

            // Sales always take priority
            if (
              !existingAcq ||
              existingAcq.type !== 'purchase' ||
              eventDate > existingAcq.date
            ) {
              const priceInUnits =
                Number(saleEvent.payment.quantity) /
                Math.pow(10, saleEvent.payment.decimals)

              acquisitionMap.set(nftKey, {
                price: priceInUnits.toFixed(4),
                symbol: saleEvent.payment.symbol,
                date: eventDate,
                type: 'purchase',
                txHash: saleEvent.transaction || null,
              })
            }
          }
        } else if (event.event_type === 'transfer') {
          const transferEvent = event as OpenSeaTransferEvent
          if (
            transferEvent.to_address.toLowerCase() === address.toLowerCase()
          ) {
            const existingAcq = acquisitionMap.get(nftKey)
            const eventDate = new Date(transferEvent.event_timestamp * 1000)

            // Only use transfer if we don't have a purchase
            if (
              !existingAcq ||
              (existingAcq.type !== 'purchase' && eventDate > existingAcq.date)
            ) {
              const isMint =
                transferEvent.from_address ===
                '0x0000000000000000000000000000000000000000'

              acquisitionMap.set(nftKey, {
                price: null,
                symbol: null,
                date: eventDate,
                type: isMint ? 'mint' : 'transfer',
                txHash: transferEvent.transaction || null,
              })
            }
          }
        }
      }
    }
  }

  // Merge NFTs with acquisition data
  const nftsWithAcquisition: NFTWithAcquisition[] = nftsResponse.nfts.map(
    (nft) => {
      const nftKey = `${nft.contract.toLowerCase()}:${nft.identifier}`
      const acquisition = acquisitionMap.get(nftKey)

      return {
        ...nft,
        tokenType: nft.token_standard === 'erc721' ? 'ERC721' : 'ERC1155',
        acquisitionPrice: acquisition?.price || null,
        acquisitionSymbol: acquisition?.symbol || null,
        acquisitionDate: acquisition?.date || null,
        acquisitionType: acquisition?.type || 'unknown',
        acquisitionTxHash: acquisition?.txHash || null,
      }
    }
  )

  // Enrich mints with transaction values (mint cost)
  // Find mints that have a valid tx hash but no price
  const mintsToEnrich = nftsWithAcquisition.filter(
    (nft) =>
      nft.acquisitionType === 'mint' &&
      nft.acquisitionTxHash &&
      nft.acquisitionTxHash.startsWith('0x') &&
      !nft.acquisitionPrice
  )

  if (mintsToEnrich.length > 0) {
    // Batch fetch transaction values
    const txHashes = mintsToEnrich.map((nft) => nft.acquisitionTxHash!)
    const txValues = await batchGetTransactionValues(txHashes, chainId)

    // Create a map of txHash -> ETH value
    const txValueMap = new Map<string, string | null>()
    for (const { txHash, value } of txValues) {
      const ethValue = weiToEth(value)
      if (ethValue) {
        txValueMap.set(txHash, ethValue)
      }
    }

    // Update NFTs with mint costs
    for (const nft of nftsWithAcquisition) {
      if (
        nft.acquisitionType === 'mint' &&
        nft.acquisitionTxHash &&
        !nft.acquisitionPrice
      ) {
        const ethValue = txValueMap.get(nft.acquisitionTxHash)
        if (ethValue) {
          nft.acquisitionPrice = ethValue
          nft.acquisitionSymbol = 'ETH'
        }
      }
    }
  }

  // Sort by: acquisition type priority first, then by date (oldest first within each type)
  nftsWithAcquisition.sort((a, b) => {
    const priorityA = getAcquisitionTypePriority(a.acquisitionType)
    const priorityB = getAcquisitionTypePriority(b.acquisitionType)

    // First sort by type priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // Within same type, sort by date (oldest first for tax loss harvesting)
    if (!a.acquisitionDate && !b.acquisitionDate) return 0
    if (!a.acquisitionDate) return 1
    if (!b.acquisitionDate) return -1
    return a.acquisitionDate.getTime() - b.acquisitionDate.getTime()
  })

  return nftsWithAcquisition
}
