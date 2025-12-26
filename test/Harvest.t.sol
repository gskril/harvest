// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {Harvest} from "../contracts/Harvest.sol";

import {MockERC20} from "./mocks/MockERC20.sol";
import {MockERC721} from "./mocks/MockERC721.sol";
import {MockERC1155} from "./mocks/MockERC1155.sol";

contract HarvestTest is Test {
    Harvest public harvest;
    MockERC20 public erc20;
    MockERC721 public erc721;
    MockERC1155 public erc1155;

    address public user = makeAddr("user");

    function setUp() public {
        harvest = new Harvest{value: 10000 gwei}();
        erc20 = new MockERC20();
        erc721 = new MockERC721();
        erc1155 = new MockERC1155();

        // Give the user some tokens
        erc20.mint(user, 100);
        erc721.mint(user, 1);
        erc1155.mint(user, 1, 100);
    }

    function test_SellErc20() public {
        uint256 initialBalance = address(user).balance;
        uint256 initialErc20Balance = erc20.balanceOf(address(harvest));

        vm.startPrank(user);
        erc20.approve(address(harvest), 100);
        harvest.sellErc20(address(erc20), 100);
        vm.stopPrank();

        assertEq(address(user).balance, initialBalance + 1 gwei);
        assertEq(erc20.balanceOf(address(harvest)), initialErc20Balance + 100);
        assertEq(erc20.balanceOf(user), 0);
    }

    function test_SellErc721() public {
        uint256 initialBalance = address(user).balance;
        uint256 initialErc721Balance = erc721.balanceOf(address(harvest));

        vm.startPrank(user);
        erc721.approve(address(harvest), 1);
        harvest.sellErc721(address(erc721), 1);
        vm.stopPrank();

        assertEq(address(user).balance, initialBalance + 1 gwei);
        assertEq(erc721.balanceOf(address(harvest)), initialErc721Balance + 1);
        assertEq(erc721.ownerOf(1), address(harvest));
    }

    function test_SellErc1155() public {
        uint256 initialBalance = address(user).balance;
        uint256 initialErc1155Balance = erc1155.balanceOf(address(harvest), 1);

        vm.startPrank(user);
        erc1155.setApprovalForAll(address(harvest), true);
        harvest.sellErc1155(address(erc1155), 1, 100);
        vm.stopPrank();

        assertEq(address(user).balance, initialBalance + 1 gwei);
        assertEq(erc1155.balanceOf(address(harvest), 1), initialErc1155Balance + 100);
        assertEq(erc1155.balanceOf(user, 1), 0);
    }
}
