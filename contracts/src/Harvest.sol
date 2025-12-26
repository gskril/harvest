// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC1155Holder} from "@openzeppelin/token/ERC1155/utils/ERC1155Holder.sol";
import {IERC1155} from "@openzeppelin/token/ERC1155/IERC1155.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/token/ERC721/IERC721.sol";

contract Harvest is ERC1155Holder {
    event SoldErc20(address token, uint256 amount);
    event SoldErc721(address collection, uint256 tokenId);
    event SoldErc1155(address collection, uint256 tokenId, uint256 amount);

    error TransferFailed();

    constructor() payable {}

    /// @notice Allow the contract to receive ETH
    receive() external payable {}

    /// @notice Sell any amount of an ERC20 token for 1 gwei. Requires an approval for the token.
    function sellErc20(address token, uint256 amount) external {
        // This should typically use `SafeERC20`, but we don't really care if the transfer fails
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        _processSale();
        emit SoldErc20(token, amount);
    }

    /// @notice Sell an ERC721 token for 1 gwei. Requires an approval for the token.
    function sellErc721(address collection, uint256 tokenId) external {
        // This should typically be `safeTransferFrom()`, but we don't care here because the goal is to burn the token
        IERC721(collection).transferFrom(msg.sender, address(this), tokenId);
        _processSale();
        emit SoldErc721(collection, tokenId);
    }

    /// @notice Sell any amount of an ERC1155 token for 1 gwei. Requires an approval for the token.
    function sellErc1155(address collection, uint256 tokenId, uint256 amount) external {
        IERC1155(collection).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        _processSale();
        emit SoldErc1155(collection, tokenId, amount);
    }

    function _processSale() internal {
        (bool success,) = payable(msg.sender).call{value: 1 gwei}("");
        require(success, TransferFailed());
    }
}
