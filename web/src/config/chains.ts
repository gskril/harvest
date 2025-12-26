import { base, mainnet } from 'wagmi/chains'
import type { Chain } from 'wagmi/chains'

/**
 * Chain configuration for the Harvest DApp.
 *
 * To add a new chain:
 * 1. Import the chain from 'wagmi/chains'
 * 2. Add an entry to SUPPORTED_CHAINS with the chain config
 *
 * The Harvest contract is deployed at the same address on all chains:
 * 0x88bcea869a1aaa637d2d53be744172ab601c5e03
 */

export interface ChainConfig {
  /** The wagmi chain object */
  chain: Chain
  /** Alchemy network identifier for API calls */
  alchemyNetwork: string
  /** Block explorer URL */
  blockExplorer: string
  /** Whether Harvest contract is deployed on this chain */
  harvestDeployed: boolean
}

/**
 * Supported chains configuration.
 * Add new chains here - they'll automatically be available throughout the app.
 */
export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  // Ethereum Mainnet
  [mainnet.id]: {
    chain: mainnet,
    alchemyNetwork: 'eth-mainnet',
    blockExplorer: 'https://etherscan.io',
    harvestDeployed: true,
  },
  // Base
  [base.id]: {
    chain: base,
    alchemyNetwork: 'base-mainnet',
    blockExplorer: 'https://basescan.org',
    harvestDeployed: true,
  },
} as const

/** Get all wagmi chain objects */
export const getChains = (): [Chain, ...Chain[]] => {
  const chains = Object.values(SUPPORTED_CHAINS).map((c) => c.chain)
  return chains as [Chain, ...Chain[]]
}

/** Get chains where Harvest is deployed */
export const getHarvestChains = (): Chain[] => {
  return Object.values(SUPPORTED_CHAINS)
    .filter((c) => c.harvestDeployed)
    .map((c) => c.chain)
}

/** Get chain config by chain ID */
export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  return SUPPORTED_CHAINS[chainId]
}

/** Get Alchemy network name for a chain ID */
export const getAlchemyNetwork = (chainId: number): string => {
  return SUPPORTED_CHAINS[chainId]?.alchemyNetwork || 'eth-mainnet'
}

/** Get block explorer URL for a chain ID */
export const getBlockExplorer = (chainId: number): string => {
  return SUPPORTED_CHAINS[chainId]?.blockExplorer || 'https://etherscan.io'
}

/** Check if Harvest is deployed on a chain */
export const isHarvestDeployed = (chainId: number): boolean => {
  return SUPPORTED_CHAINS[chainId]?.harvestDeployed ?? false
}
