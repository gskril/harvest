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

// Response type for getTokensForOwner endpoint
interface GetTokensForOwnerResponse {
  tokens: Array<{
    contractAddress: string
    balance: string
    name?: string
    symbol?: string
    decimals?: number
    logo?: string
  }>
  pageKey?: string
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
 * Fetches all ERC20 tokens for an address using Alchemy's getTokensForOwner endpoint.
 * This returns balances WITH metadata in a single request (no N+1 queries).
 * @see https://docs.alchemy.com/reference/alchemy-gettokensforowner
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
    const params = new URLSearchParams({
      owner: address,
    })

    // Use the REST endpoint that returns tokens with metadata in one call
    const response = await fetch(`${baseUrl}/getTokensForOwner?${params}`)
    const data: GetTokensForOwnerResponse = await response.json()

    if ('error' in data) {
      console.error('Alchemy API error:', data)
      return []
    }

    // Map to our AlchemyToken format and filter zero balances
    return (data.tokens || [])
      .filter(
        (token) =>
          token.balance !== '0' &&
          token.balance !== '0x0' &&
          token.balance !==
            '0x0000000000000000000000000000000000000000000000000000000000000000'
      )
      .map((token) => ({
        contractAddress: token.contractAddress,
        tokenBalance: token.balance,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logo: token.logo,
      }))
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
