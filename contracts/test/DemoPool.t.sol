// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockToken} from "../src/MockToken.sol";
import {DemoPool} from "../src/DemoPool.sol";

contract DemoPoolTest is Test {
    MockToken internal tokenA;
    MockToken internal tokenB;
    DemoPool internal pool;

    address internal deployer = makeAddr("deployer");
    address internal trader = makeAddr("trader");
    address internal rando = makeAddr("rando");

    event Swap(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event Sync(uint256 reserve0, uint256 reserve1);

    function setUp() public {
        tokenA = new MockToken("Token A", "TKA");
        tokenB = new MockToken("Token B", "TKB");

        vm.startPrank(deployer);
        pool = new DemoPool(address(tokenA), address(tokenB));
        tokenA.mint(address(pool), 100_000e18);
        tokenB.mint(address(pool), 200_000e18);
        pool.seed();
        vm.stopPrank();

        tokenA.mint(trader, 10_000e18);
        tokenB.mint(trader, 10_000e18);
        vm.startPrank(trader);
        tokenA.approve(address(pool), type(uint256).max);
        tokenB.approve(address(pool), type(uint256).max);
        vm.stopPrank();
    }

    // --- construction ---

    function test_RevertWhen_ZeroToken() public {
        vm.expectRevert("DemoPool: zero token");
        new DemoPool(address(0), address(tokenB));
    }

    function test_RevertWhen_IdenticalTokens() public {
        vm.expectRevert("DemoPool: identical tokens");
        new DemoPool(address(tokenA), address(tokenA));
    }

    // --- liquidity ---

    function test_Seed_EmitsSync() public {
        vm.startPrank(deployer);
        DemoPool fresh = new DemoPool(address(tokenA), address(tokenB));
        tokenA.mint(address(fresh), 1_000e18);
        tokenB.mint(address(fresh), 2_000e18);
        vm.expectEmit(address(fresh));
        emit Sync(1_000e18, 2_000e18);
        fresh.seed();
        vm.stopPrank();

        (uint256 r0, uint256 r1) = fresh.getReserves();
        assertEq(r0, 1_000e18);
        assertEq(r1, 2_000e18);
    }

    function test_RevertWhen_NonOwnerSeeds() public {
        vm.prank(rando);
        vm.expectRevert("DemoPool: not owner");
        pool.seed();
    }

    // --- quoting ---

    function test_GetAmountOut_ConstantProductWithFee() public view {
        // 1000 in against 100k/200k: (1000*9970*200000e18) / (100000e18*10000 + 1000*9970)
        uint256 amountInWithFee = 1000e18 * 9970;
        uint256 expected = (amountInWithFee * 200_000e18) / (100_000e18 * 10_000 + amountInWithFee);
        assertEq(pool.getAmountOut(address(tokenA), 1000e18), expected);
    }

    function test_RevertWhen_QuoteZeroAmount() public {
        vm.expectRevert("DemoPool: zero amount in");
        pool.getAmountOut(address(tokenA), 0);
    }

    function test_RevertWhen_QuoteUnknownToken() public {
        vm.expectRevert("DemoPool: unknown token");
        pool.getAmountOut(rando, 100e18);
    }

    function test_RevertWhen_QuoteNoLiquidity() public {
        DemoPool empty = new DemoPool(address(tokenA), address(tokenB));
        vm.expectRevert("DemoPool: no liquidity");
        empty.getAmountOut(address(tokenA), 100e18);
    }

    // --- swapping ---

    function test_Swap_Token0ForToken1() public {
        uint256 expected = pool.getAmountOut(address(tokenA), 1000e18);

        vm.prank(trader);
        uint256 amountOut = pool.swap(address(tokenA), 1000e18);

        assertEq(amountOut, expected);
        assertEq(tokenB.balanceOf(trader), 10_000e18 + expected);
        (uint256 r0, uint256 r1) = pool.getReserves();
        assertEq(r0, 100_000e18 + 1000e18);
        assertEq(r1, 200_000e18 - expected);
    }

    function test_Swap_Token1ForToken0() public {
        uint256 expected = pool.getAmountOut(address(tokenB), 2000e18);

        vm.prank(trader);
        uint256 amountOut = pool.swap(address(tokenB), 2000e18);

        assertEq(amountOut, expected);
        (uint256 r0, uint256 r1) = pool.getReserves();
        assertEq(r0, 100_000e18 - expected);
        assertEq(r1, 200_000e18 + 2000e18);
    }

    function test_Swap_EmitsSwapAndSync() public {
        uint256 expected = pool.getAmountOut(address(tokenA), 1000e18);

        vm.expectEmit(address(pool));
        emit Swap(trader, address(tokenA), 1000e18, expected);
        vm.expectEmit(address(pool));
        emit Sync(100_000e18 + 1000e18, 200_000e18 - expected);

        vm.prank(trader);
        pool.swap(address(tokenA), 1000e18);
    }

    function test_Swap_PriceImpactGrowsWithSize() public view {
        // Deeper slippage per unit on the larger trade.
        uint256 smallOut = pool.getAmountOut(address(tokenA), 100e18);
        uint256 bigOut = pool.getAmountOut(address(tokenA), 10_000e18);
        assertLt(bigOut * 100e18 / 10_000e18, smallOut);
    }
}
