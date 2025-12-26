import { useQuery } from '@tanstack/react-query'
import { useAccount, useChainId } from 'wagmi'

import { getTokenBalances } from '@/lib/alchemy'

export function useTokens() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  const {
    data: tokens = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tokens', address, chainId],
    queryFn: () => getTokenBalances(address!, chainId),
    enabled: !!address && isConnected,
    staleTime: 30_000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false,
  })

  return {
    tokens,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  }
}
