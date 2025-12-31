import { base, mainnet, zksync } from 'wagmi/chains'
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
  openseaChain?: string
  /** Block explorer URL */
  blockExplorer: string
  /** Whether Harvest contract is deployed on this chain */
  harvestDeployed: boolean
  /** Harvest contract address on this chain */
  harvestAddress: `0x${string}`
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
    harvestAddress: '0x88BCEa869A1Aaa637d2d53BE744172aB601c5e03',
  },
  // Base
  [base.id]: {
    chain: base,
    openseaChain: 'base',
    blockExplorer: 'https://basescan.org',
    harvestDeployed: true,
    harvestAddress: '0x88BCEa869A1Aaa637d2d53BE744172aB601c5e03',
  },
  // ZKsync
  [zksync.id]: {
    chain: zksync,
    blockExplorer: 'https://explorer.zksync.io',
    harvestDeployed: true,
    harvestAddress: '0xe65ce631206D8e70218C6a20825Ff0E34062f2cc',
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

/** Get Harvest contract address for a chain ID */
export const getHarvestAddress = (
  chainId: number
): `0x${string}` | undefined => {
  return SUPPORTED_CHAINS[chainId]?.harvestAddress
}
