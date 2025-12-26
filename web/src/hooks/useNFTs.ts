import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getNFTsForOwner, type AlchemyNFT } from '@/lib/alchemy';

export function useNFTs() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [nfts, setNfts] = useState<AlchemyNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNFTs = useCallback(async () => {
    if (!address || !isConnected) {
      setNfts([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getNFTsForOwner(address, chainId);
      setNfts(result.ownedNfts);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
      setNfts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, isConnected]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    isLoading,
    error,
    totalCount,
    refetch: fetchNFTs,
  };
}
