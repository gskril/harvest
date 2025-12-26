import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { getChains } from '@/config/chains'
import { createConfig, http } from 'wagmi'
import {
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets'
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
