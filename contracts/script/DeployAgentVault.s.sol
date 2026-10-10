// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";
import {AgentVault} from "../src/AgentVault.sol";

/// @title DeployAgentVault
/// @notice Deploys the demo AgentVault for the reference yield agent and
///         authorizes it as a Reputation executor so deposits/withdrawals
///         mint attestations.
///
/// Usage (from contracts/, env from repo-root .env):
///   forge script script/DeployAgentVault.s.sol:DeployAgentVault --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
///
/// Env: MONAD_PRIVATE_KEY (required); AGENT_REGISTRY_ADDRESS / REPUTATION_ADDRESS
///      fall back to the live testnet addresses (docs/02); AGENT_VAULT_AGENT_ID
///      defaults to 1 (the reference yield agent).
contract DeployAgentVault is Script {
    function run() external returns (AgentVault vault) {
        uint256 deployerKey = vm.envUint("MONAD_PRIVATE_KEY");

        AgentRegistry registry =
            AgentRegistry(vm.envOr("AGENT_REGISTRY_ADDRESS", address(0x62cd4e0C5B0D4587861a21710ed15ba1823a6341)));
        Reputation reputation =
            Reputation(vm.envOr("REPUTATION_ADDRESS", address(0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8)));
        uint256 agentId = vm.envOr("AGENT_VAULT_AGENT_ID", uint256(1));

        vm.startBroadcast(deployerKey);
        vault = new AgentVault(registry, reputation, agentId);
        reputation.setExecutor(address(vault), true);
        vm.stopBroadcast();

        console.log("AgentVault:", address(vault));
        console.log("Authorized as Reputation executor for agent", agentId);
    }
}
