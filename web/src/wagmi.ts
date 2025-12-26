import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { getChains } from '@/config/chains';

export const config = getDefaultConfig({
  appName: 'Harvest DApp',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: getChains(),
  ssr: false,
});
