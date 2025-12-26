// Alchemy API Types and Helpers
import { getAlchemyNetwork } from '@/config/chains';

export interface AlchemyToken {
  contractAddress: string;
  tokenBalance: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  logo?: string;
}

export interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}

export interface AlchemyNFT {
  contract: {
    address: string;
    name?: string;
    symbol?: string;
    tokenType: 'ERC721' | 'ERC1155';
    openSeaMetadata?: {
      imageUrl?: string;
      collectionName?: string;
    };
  };
  tokenId: string;
  tokenType: 'ERC721' | 'ERC1155';
  name?: string;
  description?: string;
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  raw?: {
    metadata?: {
      image?: string;
      name?: string;
    };
  };
  balance?: string;
}

export interface AlchemyTokenBalancesResponse {
  address: string;
  tokenBalances: Array<{
    contractAddress: string;
    tokenBalance: string;
  }>;
}

export interface AlchemyNFTsResponse {
  ownedNfts: AlchemyNFT[];
  totalCount: number;
  pageKey?: string;
}

const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || '';

const getAlchemyBaseUrl = (chainId: number): string => {
  const network = getAlchemyNetwork(chainId);
  return `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
};

const getNftApiBaseUrl = (chainId: number): string => {
  const network = getAlchemyNetwork(chainId);
  return `https://${network}.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;
};

export async function getTokenBalances(
  address: string,
  chainId: number
): Promise<AlchemyToken[]> {
  if (!ALCHEMY_API_KEY) {
    console.warn('Alchemy API key not set');
    return [];
  }

  try {
    const baseUrl = getAlchemyBaseUrl(chainId);
    
    // Get token balances
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Alchemy API error:', data.error);
      return [];
    }

    const balances = data.result?.tokenBalances || [];
    
    // Filter out zero balances and get metadata for each token
    const nonZeroBalances = balances.filter(
      (token: { tokenBalance: string }) => 
        token.tokenBalance !== '0x0' && 
        token.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
    );

    // Get metadata for each token
    const tokensWithMetadata = await Promise.all(
      nonZeroBalances.map(async (token: { contractAddress: string; tokenBalance: string }) => {
        const metadata = await getTokenMetadata(token.contractAddress, chainId);
        return {
          contractAddress: token.contractAddress,
          tokenBalance: token.tokenBalance,
          ...metadata,
        };
      })
    );

    return tokensWithMetadata;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    return [];
  }
}

export async function getTokenMetadata(
  contractAddress: string,
  chainId: number
): Promise<AlchemyTokenMetadata | null> {
  if (!ALCHEMY_API_KEY) {
    return null;
  }

  try {
    const baseUrl = getAlchemyBaseUrl(chainId);
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return null;
    }

    return data.result;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

export async function getNFTsForOwner(
  address: string,
  chainId: number,
  pageKey?: string
): Promise<AlchemyNFTsResponse> {
  if (!ALCHEMY_API_KEY) {
    console.warn('Alchemy API key not set');
    return { ownedNfts: [], totalCount: 0 };
  }

  try {
    const baseUrl = getNftApiBaseUrl(chainId);
    const params = new URLSearchParams({
      owner: address,
      withMetadata: 'true',
      pageSize: '100',
    });
    
    if (pageKey) {
      params.append('pageKey', pageKey);
    }

    const response = await fetch(`${baseUrl}/getNFTsForOwner?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('Alchemy NFT API error:', data.error);
      return { ownedNfts: [], totalCount: 0 };
    }

    return {
      ownedNfts: data.ownedNfts || [],
      totalCount: data.totalCount || 0,
      pageKey: data.pageKey,
    };
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return { ownedNfts: [], totalCount: 0 };
  }
}

// Helper to format token balance
export function formatTokenBalance(balance: string, decimals: number = 18): string {
  if (!balance || balance === '0x0') return '0';
  
  const balanceBigInt = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const integerPart = balanceBigInt / divisor;
  const fractionalPart = balanceBigInt % divisor;
  
  if (fractionalPart === 0n) {
    return integerPart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, 4).replace(/0+$/, '');
  
  if (trimmedFractional === '') {
    return integerPart.toString();
  }
  
  return `${integerPart}.${trimmedFractional}`;
}
