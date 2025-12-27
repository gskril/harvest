# Harvest Contracts

The Harvest contract has three main functions:

1. `sellErc20(address token, uint256 amount)` - Sell ERC20 tokens
2. `sellErc721(address collection, uint256 tokenId)` - Sell ERC721 NFTs
3. `sellErc1155(address collection, uint256 tokenId, uint256 amount)` - Sell ERC1155 NFTs

Each sale returns 1 gwei to the seller. The contract must have an ETH balance to process sales.

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```
