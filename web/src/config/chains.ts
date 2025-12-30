import { base, mainnet } from 'wagmi/chains'
import type { Chain } from 'wagmi/chains'

/**
 * Chain configuration for the Harvest DApp.
 *
 * To add a new chain:
 * 1. Import the chain from 'wagmi/chains'
 * 2. Add an entry to SUPPORTED_CHAINS with the chain config
 *
 * The Harvest contract is deployed at the same address on all chains
 */

export interface ChainConfig {
  /** The wagmi chain object */
  chain: Chain
  /** OpenSea chain identifier for API calls */
  openseaChain: string
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
    openseaChain: 'ethereum',
    blockExplorer: 'https://etherscan.io',
    harvestDeployed: true,
  },
  // Base
  [base.id]: {
    chain: base,
    openseaChain: 'base',
    blockExplorer: 'https://basescan.org',
    harvestDeployed: true,
  },
} as const

/** Get all wagmi chain objects */
export const getChains = (): [Chain, ...Chain[]] => {
  const chains = Object.values(SUPPORTED_CHAINS).map((c) => c.chain)
  return chains as [Chain, ...Chain[]]
}

/** Get chain config by chain ID */
export const getChainConfig = (chainId: number): ChainConfig | undefined => {
  return SUPPORTED_CHAINS[chainId]
}

/** Get OpenSea chain identifier for a chain ID */
export const getOpenseaChain = (chainId: number): string | undefined => {
  return SUPPORTED_CHAINS[chainId]?.openseaChain
}

/** Get block explorer URL for a chain ID */
export const getBlockExplorer = (chainId: number): string => {
  return SUPPORTED_CHAINS[chainId]?.blockExplorer || 'https://etherscan.io'
}

/** Check if Harvest is deployed on a chain */
export const isHarvestDeployed = (chainId: number): boolean => {
  return SUPPORTED_CHAINS[chainId]?.harvestDeployed ?? false
}
