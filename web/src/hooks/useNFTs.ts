import { useQuery } from '@tanstack/react-query';
import { useAccount, useChainId } from 'wagmi';
import { getNFTsForOwner } from '@/lib/alchemy';

export function useNFTs() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['nfts', address, chainId],
    queryFn: () => getNFTsForOwner(address!, chainId),
    enabled: !!address && isConnected,
    staleTime: 30_000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false,
  });

  return {
    nfts: data?.ownedNfts ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
