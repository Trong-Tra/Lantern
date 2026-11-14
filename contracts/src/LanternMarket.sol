// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./MockToken.sol";
import {DemoPool} from "./DemoPool.sol";
import {AgentRegistry} from "./AgentRegistry.sol";
import {Reputation} from "./Reputation.sol";

/// @title LanternMarket
/// @notice Settlement for user-picked solver quotes (docs/market.md).
///         Quotes live off-chain as signed messages; only the quote the user
///         picks is submitted here by the user's wallet (v1 — keeper relay later).
///         The solver fee is FEE_BPS of the executed output, paid to the agent
///         owner. Every settled trade mints an ERC-5192 attestation via
///         Reputation (this contract must be an authorized executor there).
///         Expired/reverted quotes mint nothing — track record = settled trades.
contract LanternMarket {
    /// @notice Solver fee in basis points of the executed output (locked: 20, 2026-11-14).
    uint256 public constant FEE_BPS = 20;
    uint256 private constant BPS = 10_000;
    /// @notice Max pools per route (solver search is depth-capped at the same bound).
    uint256 private constant MAX_HOPS = 4;

    /// @notice One path through the pool graph: `bps` of the total input,
    ///         swapped through `pools` in order. Bps across routes sums to 10_000.
    struct Route {
        uint16 bps;
        address[] pools;
    }

    /// @notice A solver's signed offer. Off-chain guidance: solvers set
    ///         `deadline` ~45s out (locked 2026-11-14); the contract only
    ///         enforces that it has not passed.
    struct Quote {
        uint256 agentId;
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minOut;
        uint256 quotedOut;
        uint256 deadline;
        uint256 nonce;
        Route[] routes;
    }

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

    AgentRegistry public immutable registry;
    Reputation public immutable reputation;

    /// @notice Used quote nonces per agent — replay protection.
    mapping(uint256 agentId => mapping(uint256 nonce => bool)) public usedNonce;

    constructor(AgentRegistry registry_, Reputation reputation_) {
        registry = registry_;
        reputation = reputation_;
    }

    /// @notice Execute the quote the user picked. Caller must be `quote.user`
    ///         and must have approved this contract for `quote.amountIn`.
    function executeSwap(Quote calldata quote, bytes calldata signature) external {
        if (msg.sender != quote.user) revert("LanternMarket: not quote user");
        if (block.timestamp > quote.deadline) revert("LanternMarket: quote expired");
        if (quote.routes.length == 0) revert("LanternMarket: no routes");
        if (usedNonce[quote.agentId][quote.nonce]) revert("LanternMarket: nonce used");

        address agentOwner = registry.ownerOf(quote.agentId); // reverts if unknown agent
        if (_recover(quoteDigest(quote), signature) != agentOwner) {
            revert("LanternMarket: bad signature");
        }

        // Re-quote the route set against current pool reserves before moving funds.
        if (_simulate(quote) < quote.minOut) revert("LanternMarket: output below minOut");

        usedNonce[quote.agentId][quote.nonce] = true;

        IERC20(quote.tokenIn).transferFrom(quote.user, address(this), quote.amountIn);

        uint256 amountOut = _execute(quote);
        if (amountOut < quote.minOut) revert("LanternMarket: output below minOut");

        uint256 fee = (amountOut * FEE_BPS) / BPS;
        IERC20(quote.tokenOut).transfer(agentOwner, fee);
        IERC20(quote.tokenOut).transfer(quote.user, amountOut - fee);

        reputation.mintAttestation(
            quote.agentId, Reputation.ActionType.SWAP, Reputation.Result.SUCCESS, amountOut, "LanternMarket", ""
        );

        emit TradeSettled(
            quote.agentId, quote.user, quote.tokenIn, quote.tokenOut, quote.amountIn, amountOut, fee, quote.nonce
        );
    }

    /// @notice Digest the solver signed (EIP-191 personal-sign over the abi-encoded
    ///         quote, domain-separated by chain id and this contract).
    function quoteDigest(Quote calldata quote) public view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(block.chainid, address(this), quote));
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", structHash));
    }

    /// @dev Input of route `i`: `bps` share of `amountIn`; the last route takes
    ///      the remainder so no dust is stranded by floor division.
    function _routeAmountIn(Quote calldata quote, uint256 i) internal pure returns (uint256) {
        if (i == quote.routes.length - 1) {
            uint256 consumed;
            for (uint256 j = 0; j < quote.routes.length - 1; j++) {
                consumed += (quote.amountIn * quote.routes[j].bps) / BPS;
            }
            return quote.amountIn - consumed;
        }
        return (quote.amountIn * quote.routes[i].bps) / BPS;
    }

    /// @dev Expected output at current reserves. Also validates route topology:
    ///      bps sums to 10_000, hops chain tokenIn → tokenOut, ≤ MAX_HOPS each.
    function _simulate(Quote calldata quote) internal view returns (uint256 totalOut) {
        uint256 bpsSum;
        for (uint256 i = 0; i < quote.routes.length; i++) {
            Route calldata route = quote.routes[i];
            bpsSum += route.bps;
            uint256 hopAmount = _routeAmountIn(quote, i);
            address hopToken = quote.tokenIn;
            if (route.pools.length == 0 || route.pools.length > MAX_HOPS) {
                revert("LanternMarket: bad route length");
            }
            for (uint256 j = 0; j < route.pools.length; j++) {
                DemoPool pool = DemoPool(route.pools[j]);
                hopAmount = pool.getAmountOut(hopToken, hopAmount);
                hopToken = hopToken == pool.token0() ? pool.token1() : pool.token0();
            }
            if (hopToken != quote.tokenOut) revert("LanternMarket: route ends wrong token");
            totalOut += hopAmount;
        }
        if (bpsSum != BPS) revert("LanternMarket: bps must sum to 10000");
    }

    /// @dev Execute all routes atomically; returns the total output received.
    ///      Assumes `_simulate` already validated topology and liquidity.
    function _execute(Quote calldata quote) internal returns (uint256 totalOut) {
        for (uint256 i = 0; i < quote.routes.length; i++) {
            Route calldata route = quote.routes[i];
            uint256 hopAmount = _routeAmountIn(quote, i);
            address hopToken = quote.tokenIn;
            for (uint256 j = 0; j < route.pools.length; j++) {
                DemoPool pool = DemoPool(route.pools[j]);
                IERC20(hopToken).approve(address(pool), hopAmount);
                hopAmount = pool.swap(hopToken, hopAmount);
                hopToken = hopToken == pool.token0() ? pool.token1() : pool.token0();
            }
            totalOut += hopAmount;
        }
    }

    /// @dev ecrecover with malleability checks (homestead-style personal sig).
    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert("LanternMarket: bad signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert("LanternMarket: bad signature v");
        // secp256k1n/2 — reject high-s (malleable) signatures.
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert("LanternMarket: bad signature s");
        }
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert("LanternMarket: bad signature");
        return signer;
    }
}
