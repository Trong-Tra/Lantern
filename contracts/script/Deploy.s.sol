// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentPassport} from "../src/AgentPassport.sol";
import {Reputation} from "../src/Reputation.sol";

/// @title Deploy
/// @notice Deploys the three identity contracts. Target: Monad testnet (docs/02),
///         but nothing runs until the owner says go — chain ID comes from the RPC.
///
/// Usage (from contracts/, env from repo-root .env — see .env.example):
///   export $(grep -v '^#' ../.env | xargs)   # or use direnv — never commit values
///   forge script script/Deploy.s.sol:Deploy --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
contract Deploy is Script {
    function run()
        external
        returns (AgentRegistry registry, AgentPassport passport, Reputation reputation)
    {
        // Key is read from the environment — never passed on the command line.
        uint256 deployerKey = vm.envUint("MONAD_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        registry = new AgentRegistry();
        passport = new AgentPassport(registry);
        reputation = new Reputation(registry);
        vm.stopBroadcast();

        console.log("AgentRegistry:", address(registry));
        console.log("AgentPassport:", address(passport));
        console.log("Reputation:", address(reputation));
        console.log("Next: set AGENT_REGISTRY_ADDRESS in .env, then run SeedAgents.");
    }
}
