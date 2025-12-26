import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getTokenBalances, type AlchemyToken } from '@/lib/alchemy';

export function useTokens() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [tokens, setTokens] = useState<AlchemyToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!address || !isConnected) {
      setTokens([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedTokens = await getTokenBalances(address, chainId);
      setTokens(fetchedTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, isConnected]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    tokens,
    isLoading,
    error,
    refetch: fetchTokens,
  };
}
