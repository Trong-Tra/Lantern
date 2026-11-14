// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";

/// @title Deploy
/// @notice Deploys the identity stack: ERC-8004-style AgentRegistry + ERC-5192
///         soulbound Reputation. Target: Avalanche Fuji testnet (docs/contracts.md), but nothing
///         runs until the owner says go — chain ID comes from the RPC.
///
/// Usage (from contracts/, env from repo-root .env — see .env.example):
///   export $(grep -v '^#' ../.env | xargs)   # or use direnv — never commit values
///   forge script script/Deploy.s.sol:Deploy --rpc-url $AVAX_FUJI_RPC_URL --broadcast
contract Deploy is Script {
    function run() external returns (AgentRegistry registry, Reputation reputation) {
        // Key is read from the environment — never passed on the command line.
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        registry = new AgentRegistry();
        reputation = new Reputation(registry);
        vm.stopBroadcast();

        console.log("AgentRegistry:", address(registry));
        console.log("Reputation:", address(reputation));
        console.log("Next: set AGENT_REGISTRY_ADDRESS in .env, then run SeedAgents.");
    }
}
