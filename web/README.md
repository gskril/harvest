# Harvest

A single page application for interacting with the Harvest smart contract. Users can connect their Ethereum wallet, view their tokens and NFTs, and sell them to the Harvest contract for 1 gwei each.

## Features

- **Wallet Connection**: Connect using RainbowKit with support for multiple wallets
- **Multi-chain Support**: Works on Ethereum, Sepolia, Polygon, Arbitrum, Optimism, and Base
- **Token Display**: View all ERC20 tokens in your wallet (via Alchemy API)
- **NFT Display**: View all NFTs (ERC721 & ERC1155) in your wallet (via Alchemy API)
- **Sell Tokens**: Approve and sell tokens to the Harvest contract
- **Beautiful UI**: Built with shadcn/ui components and Tailwind CSS

## Prerequisites

- Node.js 18+
- npm or yarn
- A WalletConnect Project ID (get one at [WalletConnect Cloud](https://cloud.walletconnect.com/))
- An Alchemy API Key (get one at [Alchemy](https://www.alchemy.com/))
- A deployed Harvest contract address

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example file:

```bash
cp .env.example .env
```

3. Fill in your environment variables in `.env`:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_ALCHEMY_API_KEY=your_alchemy_api_key
VITE_HARVEST_ADDRESS=0x...your_deployed_harvest_contract
```

## Development

Start the development server:

```bash
npm run dev
```

## Build

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Technology Stack

- **React 18** - UI Framework
- **Vite** - Build Tool
- **TypeScript** - Type Safety
- **wagmi** - React Hooks for Ethereum
- **viem** - TypeScript Interface for Ethereum
- **RainbowKit** - Wallet Connection UI
- **TanStack Query** - Async State Management
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI Components
- **Alchemy API** - Token and NFT Data

## Contract Interaction

The app interacts with the Harvest contract which has three main functions:

1. `sellErc20(address token, uint256 amount)` - Sell ERC20 tokens
2. `sellErc721(address collection, uint256 tokenId)` - Sell ERC721 NFTs
3. `sellErc1155(address collection, uint256 tokenId, uint256 amount)` - Sell ERC1155 NFTs

Each sale returns 1 gwei to the seller. The contract must have ETH balance to process sales.

## License

MIT
