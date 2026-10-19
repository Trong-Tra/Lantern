// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "./AgentRegistry.sol";
import {Reputation} from "./Reputation.sol";

/// @notice Minimal mintable ERC-20 surface the pool needs (matches in-house mocks).
interface IMintableERC20 {
    function mint(address to, uint256 amount) external;

    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

/// @title DemoFXPool
/// @notice FinTechathon v2 demo protocol — the agent-wallet currency corridor
///         (master plan docs/11 v3). Flow: a fresh agent wallet is funded once
///         by the user from MetaMask (the signature moment); the wallet's agent
///         then acts by itself: `enroll` commits an immutable on-chain swap
///         policy, the boot leg converts MON -> CNY (uncounted, position
///         setup), and the three corridor hops run unattended —
///         CNY -> USDC -> MON -> SGD. Every counted hop mints a SWAP/SUCCESS
///         attestation (amount normalized to MON-wei) via Reputation (the pool
///         is an authorized executor); the 4th counted swap reverts
///         "DemoFX: policy exhausted" — the policy gate judges can poke at.
///
///         Fixed rates are quoted against MON as numeraire and are symmetric,
///         so no arb exists: 1 MON = 12 mUSDC = 85.2 mCNY = 15.84 mSGD
///         (i.e. 1 USDC = 7.10 CNY = 1.32 SGD — docs/09 corridor story).
///         mCNY/mSGD/mUSDC are minted on demand by the pool; native MON legs
///         are backed by pool reserves (boot leg + swaps that paid MON in).
contract DemoFXPool {
    // Token ids used across routes/quotes.
    uint8 internal constant T_MON = 0;
    uint8 internal constant T_USDC = 1;
    uint8 internal constant T_CNY = 2;
    uint8 internal constant T_SGD = 3;

    /// @notice Boot leg: MON -> CNY (position setup, does NOT consume policy).
    uint8 public constant R_MON_CNY = 0;
    /// @notice Agent corridor hops (each consumes one policy slot):
    uint8 public constant R_CNY_USDC = 1;
    uint8 public constant R_USDC_MON = 2;
    uint8 public constant R_MON_SGD = 3;
    uint8 internal constant R_MAX = 3;

    /// @notice Corridor rates vs the MON numeraire (token units per 1 MON, 6dp for tokens).
    uint256 public constant USDC_PER_MON = 12e6; // 1 MON = 12 mUSDC
    uint256 public constant CNY_PER_MON = 85_200_000; // 1 MON = 85.2 mCNY (1 USDC = 7.10 CNY)
    uint256 public constant SGD_PER_MON = 15_840_000; // 1 MON = 15.84 mSGD (1 USDC = 1.32 SGD)

    string public constant PROTOCOL = "demo://protocols/demo-fx";
    string constant SWAP_URI = "demo://demofx/corridor-swap";

    AgentRegistry public immutable registry;
    Reputation public immutable reputation;
    uint256 public immutable agentId;
    IMintableERC20 public immutable usdc;
    IMintableERC20 public immutable cny;
    IMintableERC20 public immutable sgd;

    /// @notice Per-wallet, one-shot swap policy. Once set it can never change,
    ///         so a generous `maxSwaps` cannot be renegotiated mid-flight.
    struct Policy {
        uint16 maxSwaps;
        uint16 used;
        bool set;
    }

    mapping(address wallet => Policy) public policies;

    event Enrolled(address indexed wallet, uint16 maxSwaps);
    event PoolSwap(
        address indexed wallet,
        uint8 routeId,
        uint8 tokenIn,
        uint8 tokenOut,
        uint256 inAmount,
        uint256 outAmount,
        bool counted
    );

    constructor(
        AgentRegistry registry_,
        Reputation reputation_,
        uint256 agentId_,
        IMintableERC20 usdc_,
        IMintableERC20 cny_,
        IMintableERC20 sgd_
    ) {
        registry = registry_;
        reputation = reputation_;
        agentId = agentId_;
        usdc = usdc_;
        cny = cny_;
        sgd = sgd_;
        registry_.ownerOf(agentId_); // reverts "AgentRegistry: unknown agent"
    }

    receive() external payable {
        revert("DemoFX: use swap()");
    }

    /// @notice Commit the wallet's swap policy. One active mandate per wallet:
    ///         while slots remain the policy cannot be raised or reset (the gate
    ///         cannot be renegotiated mid-flight). Once a mandate is FULLY
    ///         consumed the same wallet may commit a fresh one — the wallet and
    ///         its funds are never replaced, only its authority is re-granted.
    function enroll(uint16 maxSwaps) external {
        Policy storage policy = policies[msg.sender];
        if (policy.set && policy.used < policy.maxSwaps) revert("DemoFX: policy set");
        if (maxSwaps == 0) revert("DemoFX: zero policy");
        policies[msg.sender] = Policy({maxSwaps: maxSwaps, used: 0, set: true});
        emit Enrolled(msg.sender, maxSwaps);
    }

    /// @notice Execute one corridor swap for `msg.sender` (the agent wallet).
    /// @param routeId One of R_MON_CNY (boot, uncounted), R_CNY_USDC, R_USDC_MON, R_MON_SGD.
    /// @param inAmount Input amount in the input token's units (6dp for the mock currencies).
    /// @dev Native-MON input must be sent as `value` == inAmount; token input is
    ///      pulled via transferFrom (approve first) and `value` must be 0.
    function swap(uint8 routeId, uint256 inAmount) external payable {
        if (routeId > R_MAX) revert("DemoFX: unknown route");
        if (inAmount == 0) revert("DemoFX: zero amount");

        bool counted = routeId != R_MON_CNY;
        (uint8 tokenIn, uint8 tokenOut) = _tokens(routeId);
        uint256 outAmount = _quote(routeId, inAmount);

        if (counted) {
            Policy storage policy = policies[msg.sender];
            if (!policy.set) revert("DemoFX: no policy");
            if (policy.used >= policy.maxSwaps) revert("DemoFX: policy exhausted");
            policy.used++; // effects before interactions; the whole tx is atomic anyway
        }

        // Pull the input leg.
        if (tokenIn == T_MON) {
            if (msg.value != inAmount) revert("DemoFX: wrong value");
        } else {
            if (msg.value != 0) revert("DemoFX: unexpected value");
            if (!_pull(tokenIn, msg.sender, inAmount)) revert("DemoFX: pull failed");
        }

        // Pay the output leg.
        if (tokenOut == T_MON) {
            if (address(this).balance < outAmount) revert("DemoFX: pool short on MON");
            (bool ok,) = payable(msg.sender).call{value: outAmount}("");
            if (!ok) revert("DemoFX: MON transfer failed");
        } else {
            _mint(tokenOut, msg.sender, outAmount);
        }

        emit PoolSwap(msg.sender, routeId, tokenIn, tokenOut, inAmount, outAmount, counted);

        if (counted) {
            // amount is normalized to MON-wei so history stats stay comparable
            // across currencies.
            reputation.mintAttestation(
                agentId,
                Reputation.ActionType.SWAP,
                Reputation.Result.SUCCESS,
                _monEquivalent(tokenIn, inAmount),
                PROTOCOL,
                SWAP_URI
            );
        }
    }

    /// @notice View quote for UI previews: output amount for a route + input.
    function quote(uint8 routeId, uint256 inAmount) external pure returns (uint256) {
        if (routeId > R_MAX) revert("DemoFX: unknown route");
        return _quote(routeId, inAmount);
    }

    function _tokens(uint8 routeId) internal pure returns (uint8 tokenIn, uint8 tokenOut) {
        if (routeId == R_MON_CNY) return (T_MON, T_CNY);
        if (routeId == R_CNY_USDC) return (T_CNY, T_USDC);
        if (routeId == R_USDC_MON) return (T_USDC, T_MON);
        return (T_MON, T_SGD);
    }

    function _quote(uint8 routeId, uint256 amount) internal pure returns (uint256) {
        if (routeId == R_MON_CNY) return amount * CNY_PER_MON / 1e18;
        if (routeId == R_CNY_USDC) return (amount * 1e18 / CNY_PER_MON) * USDC_PER_MON / 1e18;
        if (routeId == R_USDC_MON) return amount * 1e18 / USDC_PER_MON;
        return amount * SGD_PER_MON / 1e18;
    }

    function _monEquivalent(uint8 tokenIn, uint256 amount) internal pure returns (uint256) {
        if (tokenIn == T_MON) return amount;
        if (tokenIn == T_USDC) return amount * 1e18 / USDC_PER_MON;
        if (tokenIn == T_CNY) return amount * 1e18 / CNY_PER_MON;
        return amount * 1e18 / SGD_PER_MON;
    }

    function _tokenContract(uint8 token) internal view returns (IMintableERC20) {
        if (token == T_USDC) return usdc;
        if (token == T_CNY) return cny;
        return sgd;
    }

    function _pull(uint8 tokenIn, address from, uint256 amount) internal returns (bool) {
        return _tokenContract(tokenIn).transferFrom(from, address(this), amount);
    }

    function _mint(uint8 tokenOut, address to, uint256 amount) internal {
        _tokenContract(tokenOut).mint(to, amount);
    }
}