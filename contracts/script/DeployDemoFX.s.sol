// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {MockCNY} from "../src/MockCNY.sol";
import {MockSGD} from "../src/MockSGD.sol";
import {DemoFXPool, IMintableERC20} from "../src/DemoFXPool.sol";

/// @title DeployDemoFX
/// @notice Deploys the FinTechathon v2 agent-wallet corridor: MockUSD +
///         MockCNY + MockSGD + DemoFXPool, transfers mock ownership to the
///         pool (sole minter) and authorizes the pool as a Reputation
///         executor so every counted corridor hop mints a SWAP attestation.
///
/// Usage (from contracts/, env from repo-root .env):
///   forge script script/DeployDemoFX.s.sol:DeployDemoFX --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
///
/// Env: MONAD_PRIVATE_KEY (required); AGENT_REGISTRY_ADDRESS / REPUTATION_ADDRESS
///      fall back to the live testnet addresses (docs/02); DEMO_FX_AGENT_ID
///      defaults to 1 (the reference yield agent).
contract DeployDemoFX is Script {
    function run() external returns (DemoFXPool pool, MockUSD usdc, MockCNY cny, MockSGD sgd) {
        uint256 deployerKey = vm.envUint("MONAD_PRIVATE_KEY");

        AgentRegistry registry =
            AgentRegistry(vm.envOr("AGENT_REGISTRY_ADDRESS", address(0x62cd4e0C5B0D4587861a21710ed15ba1823a6341)));
        Reputation reputation =
            Reputation(vm.envOr("REPUTATION_ADDRESS", address(0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8)));
        uint256 agentId = vm.envOr("DEMO_FX_AGENT_ID", uint256(1));

        vm.startBroadcast(deployerKey);
        usdc = new MockUSD();
        cny = new MockCNY();
        sgd = new MockSGD();
        pool = new DemoFXPool(
            registry,
            reputation,
            agentId,
            IMintableERC20(address(usdc)),
            IMintableERC20(address(cny)),
            IMintableERC20(address(sgd))
        );
        usdc.transferOwnership(address(pool));
        cny.transferOwnership(address(pool));
        sgd.transferOwnership(address(pool));
        reputation.setExecutor(address(pool), true);
        vm.stopBroadcast();

        console.log("MockUSD (mUSDC):", address(usdc));
        console.log("MockCNY (mCNY):", address(cny));
        console.log("MockSGD (mSGD):", address(sgd));
        console.log("DemoFXPool:", address(pool));
        console.log("Mock minters are the pool:", usdc.owner() == address(pool));
        console.log("Reputation executor authorized for agent", agentId);
    }
}