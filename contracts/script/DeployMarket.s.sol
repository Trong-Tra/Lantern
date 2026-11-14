// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockToken} from "../src/MockToken.sol";
import {DemoPool} from "../src/DemoPool.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";
import {LanternMarket} from "../src/LanternMarket.sol";

/// @title DeployMarket
/// @notice Deploys the market side of Phase 0 onto an already-deployed identity
///         stack: MockTokens, DemoPools (seeded from script/seed/market.json),
///         and LanternMarket wired as a Reputation executor.
///         Target: Avalanche Fuji testnet (docs/market.md).
///
/// Usage (from contracts/, after Deploy — env from repo-root .env):
///   forge script script/DeployMarket.s.sol:DeployMarket --rpc-url $AVAX_FUJI_RPC_URL --broadcast
///
/// The deploy loop lives in {deployFromJson} so tests can exercise the exact
/// same code path in-memory without broadcasting anything.
contract DeployMarket is Script {
    string constant SEED_PATH = "script/seed/market.json";
    uint256 constant MAX_TOKENS = 20; // sanity guards against a runaway JSON
    uint256 constant MAX_POOLS = 50;

    struct MarketDeployment {
        MockToken[] tokens;
        DemoPool[] pools;
        LanternMarket market;
    }

    /// @notice Deploys tokens + seeded pools + LanternMarket per the seed JSON.
    ///         Pool liquidity is minted directly into each pool; the caller
    ///         (broadcaster) becomes pool owner.
    function deployFromJson(AgentRegistry registry, Reputation reputation, string memory json)
        public
        returns (MarketDeployment memory d)
    {
        uint256 tokenCount = vm.parseJsonUint(json, ".tokenCount");
        if (tokenCount == 0) revert("DeployMarket: empty seed");
        if (tokenCount > MAX_TOKENS) revert("DeployMarket: tokenCount exceeds MAX_TOKENS");

        d.tokens = new MockToken[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            string memory prefix = string.concat(".tokens[", vm.toString(i), "]");
            string memory tokenName = vm.parseJsonString(json, string.concat(prefix, ".name"));
            string memory symbol = vm.parseJsonString(json, string.concat(prefix, ".symbol"));
            d.tokens[i] = new MockToken(tokenName, symbol);
        }

        uint256 poolCount = vm.parseJsonUint(json, ".poolCount");
        if (poolCount == 0 || poolCount > MAX_POOLS) revert("DeployMarket: bad poolCount");

        d.pools = new DemoPool[](poolCount);
        for (uint256 i = 0; i < poolCount; i++) {
            string memory prefix = string.concat(".pools[", vm.toString(i), "]");
            uint256 idx0 = vm.parseJsonUint(json, string.concat(prefix, ".token0"));
            uint256 idx1 = vm.parseJsonUint(json, string.concat(prefix, ".token1"));
            if (idx0 >= tokenCount || idx1 >= tokenCount) revert("DeployMarket: bad token index");
            uint256 liquidity0 = vm.parseJsonUint(json, string.concat(prefix, ".liquidity0")) * 1e18;
            uint256 liquidity1 = vm.parseJsonUint(json, string.concat(prefix, ".liquidity1")) * 1e18;

            DemoPool pool = new DemoPool(address(d.tokens[idx0]), address(d.tokens[idx1]));
            d.tokens[idx0].mint(address(pool), liquidity0);
            d.tokens[idx1].mint(address(pool), liquidity1);
            pool.seed();
            d.pools[i] = pool;
        }

        d.market = new LanternMarket(registry, reputation);
        reputation.setExecutor(address(d.market), true);
    }

    function run() external {
        AgentRegistry registry = AgentRegistry(vm.envAddress("AGENT_REGISTRY_ADDRESS"));
        Reputation reputation = Reputation(vm.envAddress("REPUTATION_ADDRESS"));
        string memory json = vm.readFile(SEED_PATH);

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        MarketDeployment memory d = deployFromJson(registry, reputation, json);
        vm.stopBroadcast();

        for (uint256 i = 0; i < d.tokens.length; i++) {
            console.log("Token %s:", d.tokens[i].symbol(), address(d.tokens[i]));
        }
        for (uint256 i = 0; i < d.pools.length; i++) {
            console.log("Pool", i, address(d.pools[i]));
        }
        console.log("LanternMarket:", address(d.market));
        console.log("Next: set LANTERN_MARKET_ADDRESS + pool addresses in .env / indexer config.");
    }
}
