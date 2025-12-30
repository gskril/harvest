# Harvest Website

A single page application for interacting with the [Harvest smart contract](../contracts/README.md). Users can connect their Ethereum wallet, view their tokens and NFTs, and sell them to the Harvest contract for 1 gwei each.

> [!WARNING]
> This web app is nearly 100% vibe coded. Use with caution.

## Prerequisites

- Node.js 22+
- bun 1+
- A WalletConnect Project ID (get one from [Reown](https://reown.com/))
- An Alchemy API Key (get one at [Alchemy](https://www.alchemy.com/))
- An OpenSea API Key (get one at [OpenSea](https://opensea.io/settings/developer))

## Development

Install dependencies:

```bash
bun install
```

Copy the environment example file and fill in the values:

```bash
cp .env.example .env
```

Start the development server:

```bash
bun run dev
```

## Build

Build for production:

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```
