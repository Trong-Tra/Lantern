// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockToken} from "../src/MockToken.sol";
import {DemoPool} from "../src/DemoPool.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";
import {LanternMarket} from "../src/LanternMarket.sol";
import {DeployMarket} from "../script/DeployMarket.s.sol";

contract DeployMarketTest is Test {
    string constant SEED_PATH = "script/seed/market.json";

    AgentRegistry internal registry;
    Reputation internal reputation;
    DeployMarket internal script;

    function setUp() public {
        registry = new AgentRegistry();
        script = new DeployMarket();
        // deployFromJson calls reputation.setExecutor as the *script* contract,
        // mirroring how the broadcaster calls it as the deployer EOA on-chain.
        vm.prank(address(script));
        reputation = new Reputation(registry);
    }

    function _deploy() internal returns (DeployMarket.MarketDeployment memory) {
        return script.deployFromJson(registry, reputation, vm.readFile(SEED_PATH));
    }

    function test_DeploysSeedShape() public {
        DeployMarket.MarketDeployment memory d = _deploy();

        assertEq(d.tokens.length, 5);
        assertEq(d.pools.length, 9);
        assertEq(d.tokens[0].symbol(), "mUSDC");
        assertEq(d.tokens[4].symbol(), "mWBTC");

        // First pool: 500k/500k mUSDC/mUSDT.
        (uint256 r0, uint256 r1) = d.pools[0].getReserves();
        assertEq(r0, 500_000e18);
        assertEq(r1, 500_000e18);
        assertEq(d.pools[0].token0(), address(d.tokens[0]));
        assertEq(d.pools[0].token1(), address(d.tokens[1]));

        // Market wired as a Reputation executor.
        assertTrue(reputation.executors(address(d.market)));
        assertEq(address(d.market.registry()), address(registry));
        assertEq(address(d.market.reputation()), address(reputation));
    }

    function test_RevertWhen_EmptySeed() public {
        vm.expectRevert("DeployMarket: empty seed");
        script.deployFromJson(registry, reputation, '{"tokenCount":0}');
    }

    function test_RevertWhen_BadTokenIndex() public {
        string memory json = '{"tokenCount":1,"tokens":[{"name":"A","symbol":"A"}],'
            '"poolCount":1,"pools":[{"token0":0,"token1":5,"liquidity0":1,"liquidity1":1}]}';
        vm.expectRevert("DeployMarket: bad token index");
        script.deployFromJson(registry, reputation, json);
    }

    /// @notice End-to-end on the seeded topology: a registered solver signs a
    ///         50/50 split quote across the two mUSDC/mUSDT pools, the user
    ///         executes it, the attestation mints.
    function test_EndToEnd_SplitSwapOnSeededPools() public {
        DeployMarket.MarketDeployment memory d = _deploy();

        (address solver, uint256 solverKey) = makeAddrAndKey("solver");
        vm.prank(solver);
        registry.registerAgent("ipfs://solver-1");

        address user = makeAddr("user");
        uint256 amountIn = 1_000e18;
        d.tokens[0].mint(user, amountIn);
        vm.prank(user);
        d.tokens[0].approve(address(d.market), amountIn);

        LanternMarket.Route[] memory routes = new LanternMarket.Route[](2);
        routes[0].bps = 5_000;
        routes[0].pools = new address[](1);
        routes[0].pools[0] = address(d.pools[0]);
        routes[1].bps = 5_000;
        routes[1].pools = new address[](1);
        routes[1].pools[0] = address(d.pools[1]);

        LanternMarket.Quote memory quote = LanternMarket.Quote({
            agentId: 1,
            user: user,
            tokenIn: address(d.tokens[0]),
            tokenOut: address(d.tokens[1]),
            amountIn: amountIn,
            minOut: 1,
            quotedOut: 1,
            deadline: block.timestamp + 45,
            nonce: 1,
            routes: routes
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(solverKey, d.market.quoteDigest(quote));

        vm.prank(user);
        d.market.executeSwap(quote, abi.encodePacked(r, s, v));

        assertGt(d.tokens[1].balanceOf(user), 0);
        assertGt(d.tokens[1].balanceOf(solver), 0, "solver fee paid");
        assertEq(reputation.balanceOf(solver), 1, "attestation minted");
    }
}
