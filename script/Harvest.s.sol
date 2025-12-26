// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Script} from "forge-std/Script.sol";
import {Harvest} from "../contracts/Harvest.sol";

contract HarvestScript is Script {
    Harvest public harvest;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        harvest = new Harvest{salt: 0, value: 10000 gwei}();

        vm.stopBroadcast();
    }
}
