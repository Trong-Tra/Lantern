// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./MockToken.sol";

/// @title DemoPool
/// @notice Constant-product pair pool (docs/market.md). Multiple pools per pair
///         at varied liquidity so route/slice choice actually matters.
///         No LP tokens: liquidity is seeded once by the deployer for demos.
///         Swaps pull `tokenIn` from the caller (caller must approve first).
contract DemoPool {
    /// @notice Pool fee in basis points (30 = 0.30%, Uniswap-v2 style).
    uint256 public constant FEE_BPS = 30;
    uint256 private constant BPS = 10_000;

    address public immutable token0;
    address public immutable token1;
    address public immutable owner;

    uint256 public reserve0;
    uint256 public reserve1;

    event Swap(address indexed sender, address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event Sync(uint256 reserve0, uint256 reserve1);

    constructor(address token0_, address token1_) {
        if (token0_ == address(0) || token1_ == address(0)) revert("DemoPool: zero token");
        if (token0_ == token1_) revert("DemoPool: identical tokens");
        token0 = token0_;
        token1 = token1_;
        owner = msg.sender;
    }

    /// @notice Adopt the pool's current token balances as its reserves.
    ///         Owner only — demo pools have no LP flow; seeding is
    ///         "mint/transfer tokens to the pool, then call seed()".
    function seed() external {
        if (msg.sender != owner) revert("DemoPool: not owner");
        reserve0 = IERC20(token0).balanceOf(address(this));
        reserve1 = IERC20(token1).balanceOf(address(this));
        emit Sync(reserve0, reserve1);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    /// @notice Output for `amountIn` of `tokenIn` at current reserves (after fee).
    function getAmountOut(address tokenIn, uint256 amountIn) public view returns (uint256 amountOut) {
        (uint256 reserveIn, uint256 reserveOut) = _reservesFor(tokenIn);
        if (amountIn == 0) revert("DemoPool: zero amount in");
        if (reserveIn == 0 || reserveOut == 0) revert("DemoPool: no liquidity");
        uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * BPS + amountInWithFee);
        if (amountOut == 0) revert("DemoPool: zero amount out");
    }

    /// @notice Swap `amountIn` of `tokenIn` for the paired token. Pulls input
    ///         from the caller and pushes output back to the caller.
    function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut) {
        amountOut = getAmountOut(tokenIn, amountIn);
        address tokenOut = tokenIn == token0 ? token1 : token0;
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        (uint256 rIn, uint256 rOut) = _reservesFor(tokenIn);
        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
        _setReserves(tokenIn, rIn + amountIn, rOut - amountOut);
    }

    function _reservesFor(address tokenIn) internal view returns (uint256 reserveIn, uint256 reserveOut) {
        if (tokenIn == token0) return (reserve0, reserve1);
        if (tokenIn == token1) return (reserve1, reserve0);
        revert("DemoPool: unknown token");
    }

    function _setReserves(address tokenIn, uint256 newReserveIn, uint256 newReserveOut) private {
        if (tokenIn == token0) {
            reserve0 = newReserveIn;
            reserve1 = newReserveOut;
        } else {
            reserve1 = newReserveIn;
            reserve0 = newReserveOut;
        }
        emit Sync(reserve0, reserve1);
    }
}
