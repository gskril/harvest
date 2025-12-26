// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {ERC721} from "@openzeppelin/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    constructor() ERC721("MockERC721", "MCK721") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
