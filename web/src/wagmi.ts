import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { createConfig, http } from 'wagmi'

import { getChains } from '@/config/chains'

import { getAlchemyBaseUrl } from './lib/alchemy'

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [rainbowWallet, walletConnectWallet],
    },
  ],
  {
    appName: 'Harvest',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  }
)

export const config = createConfig({
  chains: getChains(),
  connectors,
  transports: Object.fromEntries(
    getChains().map(({ id }) => [id, http(getAlchemyBaseUrl(id))])
  ),
})
