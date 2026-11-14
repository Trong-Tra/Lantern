// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockToken} from "../src/MockToken.sol";
import {DemoPool} from "../src/DemoPool.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";
import {LanternMarket} from "../src/LanternMarket.sol";

contract LanternMarketTest is Test {
    MockToken internal tokenA;
    MockToken internal tokenB;
    MockToken internal tokenC;
    DemoPool internal poolABDeep;
    DemoPool internal poolABShallow;
    DemoPool internal poolBC;

    AgentRegistry internal registry;
    Reputation internal reputation;
    LanternMarket internal market;

    address internal solver;
    uint256 internal solverKey;
    address internal rando;
    uint256 internal randoKey;
    address internal user = makeAddr("user");

    uint256 internal constant AGENT_ID = 1;
    uint256 internal constant AMOUNT_IN = 1_000e18;

    event TradeSettled(
        uint256 indexed agentId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 nonce
    );

    function setUp() public {
        (solver, solverKey) = makeAddrAndKey("solver");
        (rando, randoKey) = makeAddrAndKey("rando");

        registry = new AgentRegistry();
        reputation = new Reputation(registry);
        market = new LanternMarket(registry, reputation);

        vm.prank(solver);
        registry.registerAgent("ipfs://solver-1");
        reputation.setExecutor(address(market), true);

        tokenA = new MockToken("Token A", "TKA");
        tokenB = new MockToken("Token B", "TKB");
        tokenC = new MockToken("Token C", "TKC");

        // Same pair at two liquidity depths + one hop out to C.
        poolABDeep = _seedPool(tokenA, tokenB, 200_000e18, 200_000e18);
        poolABShallow = _seedPool(tokenA, tokenB, 20_000e18, 20_000e18);
        poolBC = _seedPool(tokenB, tokenC, 100_000e18, 50_000e18);

        tokenA.mint(user, 100_000e18);
        vm.prank(user);
        tokenA.approve(address(market), type(uint256).max);
    }

    function _seedPool(MockToken x, MockToken y, uint256 amountX, uint256 amountY) internal returns (DemoPool) {
        DemoPool pool = new DemoPool(address(x), address(y));
        x.mint(address(pool), amountX);
        y.mint(address(pool), amountY);
        pool.seed();
        return pool;
    }

    function _pools(DemoPool a) internal pure returns (address[] memory pools) {
        pools = new address[](1);
        pools[0] = address(a);
    }

    function _pools(DemoPool a, DemoPool b) internal pure returns (address[] memory pools) {
        pools = new address[](2);
        pools[0] = address(a);
        pools[1] = address(b);
    }

    function _quote(LanternMarket.Route[] memory routes, uint256 minOut, address tokenOut)
        internal
        view
        returns (LanternMarket.Quote memory)
    {
        return LanternMarket.Quote({
            agentId: AGENT_ID,
            user: user,
            tokenIn: address(tokenA),
            tokenOut: tokenOut,
            amountIn: AMOUNT_IN,
            minOut: minOut,
            quotedOut: minOut,
            deadline: block.timestamp + 45,
            nonce: 1,
            routes: routes
        });
    }

    function _sign(LanternMarket.Quote memory quote, uint256 key) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, market.quoteDigest(quote));
        return abi.encodePacked(r, s, v);
    }

    function _signBySolver(LanternMarket.Quote memory quote) internal view returns (bytes memory) {
        return _sign(quote, solverKey);
    }

    // --- happy paths ---

    function test_ExecuteSwap_SingleRoute() public {
        uint256 expectedOut = poolABDeep.getAmountOut(address(tokenA), AMOUNT_IN);
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, expectedOut, address(tokenB));

        uint256 fee = (expectedOut * market.FEE_BPS()) / 10_000;

        bytes memory sig = _signBySolver(quote);

        vm.expectEmit(address(market));
        emit TradeSettled(AGENT_ID, user, address(tokenA), address(tokenB), AMOUNT_IN, expectedOut, fee, 1);

        vm.prank(user);
        market.executeSwap(quote, sig);

        assertEq(tokenA.balanceOf(user), 100_000e18 - AMOUNT_IN);
        assertEq(tokenB.balanceOf(user), expectedOut - fee);
        assertEq(tokenB.balanceOf(solver), fee, "solver fee to agent owner");
        assertTrue(market.usedNonce(AGENT_ID, 1));

        // Attestation minted to the solver, recording the delivered output.
        Reputation.Attestation memory att = reputation.getAttestation(1);
        assertEq(att.agentId, AGENT_ID);
        assertEq(uint256(att.actionType), uint256(Reputation.ActionType.SWAP));
        assertEq(uint256(att.result), uint256(Reputation.Result.SUCCESS));
        assertEq(att.amount, expectedOut);
        assertEq(att.protocol, "LanternMarket");
        assertEq(reputation.ownerOf(1), solver);
    }

    function test_ExecuteSwap_SplitAcrossPools() public {
        uint256 half = AMOUNT_IN / 2;
        uint256 expectedOut = poolABDeep.getAmountOut(address(tokenA), half)
            + poolABShallow.getAmountOut(address(tokenA), AMOUNT_IN - half);

        LanternMarket.Route[] memory routes = new LanternMarket.Route[](2);
        routes[0] = LanternMarket.Route({bps: 5_000, pools: _pools(poolABDeep)});
        routes[1] = LanternMarket.Route({bps: 5_000, pools: _pools(poolABShallow)});
        LanternMarket.Quote memory quote = _quote(routes, expectedOut, address(tokenB));

        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        market.executeSwap(quote, sig);

        uint256 fee = (expectedOut * market.FEE_BPS()) / 10_000;
        assertEq(tokenB.balanceOf(user), expectedOut - fee);
        assertEq(tokenB.balanceOf(solver), fee);
    }

    function test_ExecuteSwap_MultiHop() public {
        uint256 hop1 = poolABDeep.getAmountOut(address(tokenA), AMOUNT_IN);
        uint256 expectedOut = poolBC.getAmountOut(address(tokenB), hop1);

        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep, poolBC)});
        LanternMarket.Quote memory quote = _quote(routes, expectedOut, address(tokenC));

        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        market.executeSwap(quote, sig);

        uint256 fee = (expectedOut * market.FEE_BPS()) / 10_000;
        assertEq(tokenC.balanceOf(user), expectedOut - fee);
        assertEq(tokenC.balanceOf(solver), fee);
        assertEq(tokenB.balanceOf(address(market)), 0, "no hop tokens stranded");
    }

    function test_ExecuteSwap_SplitWithRemainderNoDust() public {
        // Odd bps split: last route takes the remainder, nothing strands.
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](2);
        routes[0] = LanternMarket.Route({bps: 3_333, pools: _pools(poolABDeep)});
        routes[1] = LanternMarket.Route({bps: 6_667, pools: _pools(poolABShallow)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        market.executeSwap(quote, sig);

        assertEq(tokenA.balanceOf(address(market)), 0, "no input dust stranded");
    }

    // --- validation / security ---

    function test_RevertWhen_CallerIsNotQuoteUser() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        bytes memory sig = _signBySolver(quote);
        vm.prank(rando);
        vm.expectRevert("LanternMarket: not quote user");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_QuoteExpired() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        vm.warp(quote.deadline + 1);
        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        vm.expectRevert("LanternMarket: quote expired");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_BadSignature() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        bytes memory sig = _sign(quote, randoKey);
        vm.prank(user);
        vm.expectRevert("LanternMarket: bad signature");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_UnknownAgent() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));
        quote.agentId = 99;

        bytes memory sig = _sign(quote, randoKey);
        vm.prank(user);
        vm.expectRevert("AgentRegistry: unknown agent");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_NonceReused() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));
        bytes memory sig = _signBySolver(quote);

        vm.prank(user);
        market.executeSwap(quote, sig);

        vm.prank(user);
        vm.expectRevert("LanternMarket: nonce used");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_OutputBelowMinOut() public {
        uint256 expectedOut = poolABDeep.getAmountOut(address(tokenA), AMOUNT_IN);
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, expectedOut + 1, address(tokenB));

        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        vm.expectRevert("LanternMarket: output below minOut");
        market.executeSwap(quote, sig);

        // Nothing settled: no attestation, no nonce consumed, balances intact.
        assertEq(reputation.balanceOf(solver), 0);
        assertFalse(market.usedNonce(AGENT_ID, 1));
        assertEq(tokenA.balanceOf(user), 100_000e18);
    }

    function test_RevertWhen_BpsNotSumTo10000() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 9_999, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        vm.expectRevert("LanternMarket: bps must sum to 10000");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_NoRoutes() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](0);
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        vm.expectRevert("LanternMarket: no routes");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_RouteEndsWrongToken() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenC)); // pool settles in B

        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        vm.expectRevert("LanternMarket: route ends wrong token");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_TooManyHops() public {
        address[] memory pools = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            pools[i] = address(poolABDeep);
        }
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: pools});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        bytes memory sig = _signBySolver(quote);
        vm.prank(user);
        vm.expectRevert("LanternMarket: bad route length");
        market.executeSwap(quote, sig);
    }

    function test_RevertWhen_BadSignatureLength() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        vm.prank(user);
        vm.expectRevert("LanternMarket: bad signature length");
        market.executeSwap(quote, hex"1234");
    }

    function test_QuoteDigest_DomainSeparatedByChainAndContract() public {
        LanternMarket.Route[] memory routes = new LanternMarket.Route[](1);
        routes[0] = LanternMarket.Route({bps: 10_000, pools: _pools(poolABDeep)});
        LanternMarket.Quote memory quote = _quote(routes, 1, address(tokenB));

        bytes32 digest = market.quoteDigest(quote);
        vm.chainId(999_999);
        assertTrue(market.quoteDigest(quote) != digest, "chain id changes the digest");
    }
}
