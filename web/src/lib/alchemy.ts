// Alchemy API Types and Helpers
import { getAlchemyNetwork } from '@/config/chains'

export interface AlchemyToken {
  contractAddress: string
  tokenBalance: string
  name?: string
  symbol?: string
  decimals?: number
  logo?: string
}

export interface AlchemyNFT {
  contract: {
    address: string
    name?: string
    symbol?: string
    tokenType: 'ERC721' | 'ERC1155'
    openSeaMetadata?: {
      imageUrl?: string
      collectionName?: string
    }
  }
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  name?: string
  description?: string
  image?: {
    cachedUrl?: string
    thumbnailUrl?: string
    pngUrl?: string
    originalUrl?: string
  }
  raw?: {
    metadata?: {
      image?: string
      name?: string
    }
  }
  balance?: string
}

export interface AlchemyNFTsResponse {
  ownedNfts: AlchemyNFT[]
  totalCount: number
  pageKey?: string
}

// Response type for alchemy_getTokenBalances endpoint
interface TokenBalancesResponse {
  address: string
  tokenBalances: Array<{
    contractAddress: string
    tokenBalance: string
  }>
  pageKey?: string
}

// Response type for alchemy_getTokenMetadata endpoint
interface TokenMetadataResponse {
  name?: string
  symbol?: string
  decimals?: number
  logo?: string
}

const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || ''

export const getAlchemyBaseUrl = (chainId: number): string => {
  const network = getAlchemyNetwork(chainId)
  return `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
}

const getNftApiBaseUrl = (chainId: number): string => {
  const network = getAlchemyNetwork(chainId)
  return `https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`
}

/**
 * Fetches token metadata for multiple contract addresses in a single batch request.
 * Uses JSON-RPC batch format to avoid N+1 API calls.
 */
async function batchGetTokenMetadata(
  contractAddresses: string[],
  baseUrl: string
): Promise<(TokenMetadataResponse | null)[]> {
  if (contractAddresses.length === 0) return []

  try {
    // Build batch JSON-RPC request - array of individual requests
    const batchRequest = contractAddresses.map((address, index) => ({
      jsonrpc: '2.0',
      method: 'alchemy_getTokenMetadata',
      params: [address],
      id: index,
    }))

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchRequest),
    })

    const batchResponse = await response.json()

    // Response is an array of results, map by id to preserve order
    const resultsById = new Map<number, TokenMetadataResponse | null>()
    for (const item of batchResponse) {
      if (item.error) {
        resultsById.set(item.id, null)
      } else {
        resultsById.set(item.id, item.result)
      }
    }

    // Return results in original order
    return contractAddresses.map((_, index) => resultsById.get(index) ?? null)
  } catch {
    return contractAddresses.map(() => null)
  }
}

/**
 * Fetches all ERC20 tokens for an address using Alchemy's alchemy_getTokenBalances method.
 * Uses "erc20" param to get all ERC-20 tokens, then batch fetches metadata.
 * @see https://docs.alchemy.com/reference/alchemy-gettokenbalances
 */
export async function getTokenBalances(
  address: string,
  chainId: number
): Promise<AlchemyToken[]> {
  if (!ALCHEMY_API_KEY) {
    console.warn('Alchemy API key not set')
    return []
  }

  try {
    const baseUrl = getAlchemyBaseUrl(chainId)

    // Step 1: Get all ERC-20 token balances
    const balancesResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
        id: 1,
      }),
    })

    const balancesData = await balancesResponse.json()

    if (balancesData.error) {
      console.error('Alchemy API error:', balancesData.error)
      return []
    }

    const result: TokenBalancesResponse = balancesData.result || {
      address: '',
      tokenBalances: [],
    }

    // Filter out zero balances
    const nonZeroTokens = (result.tokenBalances || []).filter(
      (token) =>
        token.tokenBalance !== '0x0' &&
        token.tokenBalance !==
          '0x0000000000000000000000000000000000000000000000000000000000000000'
    )

    if (nonZeroTokens.length === 0) {
      return []
    }

    // Step 2: Batch fetch metadata for tokens (limit to first 100)
    const tokensToFetch = nonZeroTokens.slice(0, 100)
    const contractAddresses = tokensToFetch.map((t) => t.contractAddress)
    const metadataResults = await batchGetTokenMetadata(
      contractAddresses,
      baseUrl
    )

    // Combine balances with metadata
    return tokensToFetch.map((token, index) => {
      const metadata = metadataResults[index]
      return {
        contractAddress: token.contractAddress,
        tokenBalance: token.tokenBalance,
        name: metadata?.name,
        symbol: metadata?.symbol,
        decimals: metadata?.decimals,
        logo: metadata?.logo,
      }
    })
  } catch (error) {
    console.error('Error fetching token balances:', error)
    return []
  }
}

export async function getNFTsForOwner(
  address: string,
  chainId: number,
  pageKey?: string
): Promise<AlchemyNFTsResponse> {
  if (!ALCHEMY_API_KEY) {
    console.warn('Alchemy API key not set')
    return { ownedNfts: [], totalCount: 0 }
  }

  try {
    const baseUrl = getNftApiBaseUrl(chainId)
    const params = new URLSearchParams({
      owner: address,
      withMetadata: 'true',
      pageSize: '100',
    })

    if (pageKey) {
      params.append('pageKey', pageKey)
    }

    const response = await fetch(`${baseUrl}/getNFTsForOwner?${params}`)
    const data = await response.json()

    if (data.error) {
      console.error('Alchemy NFT API error:', data.error)
      return { ownedNfts: [], totalCount: 0 }
    }

    return {
      ownedNfts: data.ownedNfts || [],
      totalCount: data.totalCount || 0,
      pageKey: data.pageKey,
    }
  } catch (error) {
    console.error('Error fetching NFTs:', error)
    return { ownedNfts: [], totalCount: 0 }
  }
}

// Helper to format token balance
export function formatTokenBalance(
  balance: string,
  decimals: number = 18
): string {
  if (!balance || balance === '0x0') return '0'

  // Handle both hex and decimal string formats
  const balanceBigInt = balance.startsWith('0x')
    ? BigInt(balance)
    : BigInt(balance)
  const divisor = BigInt(10 ** decimals)
  const integerPart = balanceBigInt / divisor
  const fractionalPart = balanceBigInt % divisor

  if (fractionalPart === 0n) {
    return integerPart.toString()
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  const trimmedFractional = fractionalStr.slice(0, 4).replace(/0+$/, '')

  if (trimmedFractional === '') {
    return integerPart.toString()
  }

  return `${integerPart}.${trimmedFractional}`
}
