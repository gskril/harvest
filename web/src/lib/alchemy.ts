// Alchemy RPC URL helper for wagmi transports

const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || ''

// Map chain IDs to Alchemy network names
const ALCHEMY_NETWORKS: Record<number, string> = {
  1: 'eth-mainnet',
  8453: 'base-mainnet',
}

export const getAlchemyBaseUrl = (chainId: number): string => {
  const network = ALCHEMY_NETWORKS[chainId] || 'eth-mainnet'
  return `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
}
