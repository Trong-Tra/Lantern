// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

/// @title SeedAgents
/// @notice Registers the MVP set of ERC-8004 identities from script/seed/agents.json
///         into an already-deployed AgentRegistry. MVP: a single operator wallet
///         registers every identity (docs/02).
///
/// Usage (from contracts/, after Deploy — env from repo-root .env):
///   forge script script/SeedAgents.s.sol:SeedAgents --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
///
/// The registration loop lives in {registerFromJson} so tests can exercise the
/// exact same code path in-memory without broadcasting anything.
contract SeedAgents is Script {
    string constant SEED_PATH = "script/seed/agents.json";
    uint256 constant MAX_AGENTS = 100; // sanity guard against a runaway JSON

    /// @notice Reads the seed JSON and registers every agent into `registry`.
    /// @return ids The registered agent ids, in seed order (1..count for a fresh registry).
    function registerFromJson(AgentRegistry registry, string memory json)
        public
        returns (uint256[] memory ids)
    {
        uint256 count = vm.parseJsonUint(json, ".count");
        if (count == 0) revert("SeedAgents: empty seed");
        if (count > MAX_AGENTS) revert("SeedAgents: count exceeds MAX_AGENTS");

        ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            string memory uri = vm.parseJsonString(
                json, string.concat(".agents[", vm.toString(i), "].uri")
            );
            ids[i] = registry.registerAgent(uri);
        }
    }

    function run() external {
        AgentRegistry registry = AgentRegistry(vm.envAddress("AGENT_REGISTRY_ADDRESS"));
        string memory json = vm.readFile(SEED_PATH);
        uint256 count = vm.parseJsonUint(json, ".count");

        vm.startBroadcast(vm.envUint("MONAD_PRIVATE_KEY"));
        uint256[] memory ids = registerFromJson(registry, json);
        vm.stopBroadcast();

        console.log("Registered", ids.length, "agents");
        console.log("Seed count in JSON:", count);
        console.log("First id:", ids[0]);
        console.log("Last id:", ids[ids.length - 1]);
    }
}
