// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "./AgentRegistry.sol";
import {Reputation} from "./Reputation.sol";

/// @title AgentVault
/// @notice Minimal single-agent deposit pool for the reference yield agent (docs/02).
///         Users deposit MON into the agent's strategy; every deposit/withdraw
///         mints a real ERC-5192 attestation via the Reputation contract, so
///         vault flows become live reputation history. The vault must be
///         authorized as a Reputation executor (setExecutor, contract owner)
///         after deployment — otherwise deposit/withdraw revert.
contract AgentVault {
    AgentRegistry public immutable registry;
    Reputation public immutable reputation;
    uint256 public immutable agentId;

    /// @notice Attestation protocol tag for every vault action (demo scheme, docs/02).
    string public constant PROTOCOL = "demo://protocols/agent-vault";
    string constant DEPOSIT_URI = "demo://vault/deposit";
    string constant WITHDRAW_URI = "demo://vault/withdraw";

    mapping(address user => uint256) public balanceOf;
    uint256 public totalDeposits;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(AgentRegistry registry_, Reputation reputation_, uint256 agentId_) {
        registry = registry_;
        reputation = reputation_;
        agentId = agentId_;
        registry_.ownerOf(agentId_); // reverts "AgentRegistry: unknown agent"
    }

    receive() external payable {
        revert("AgentVault: use deposit()");
    }

    /// @notice Deposit MON into the agent's pool. Mints a STAKE/SUCCESS attestation.
    function deposit() external payable {
        if (msg.value == 0) revert("AgentVault: zero deposit");
        balanceOf[msg.sender] += msg.value;
        totalDeposits += msg.value;
        reputation.mintAttestation(
            agentId, Reputation.ActionType.STAKE, Reputation.Result.SUCCESS, msg.value, PROTOCOL, DEPOSIT_URI
        );
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw previously deposited MON. Mints an UNSTAKE/SUCCESS attestation.
    function withdraw(uint256 amount) external {
        if (amount == 0) revert("AgentVault: zero amount");
        if (balanceOf[msg.sender] < amount) revert("AgentVault: insufficient balance");
        balanceOf[msg.sender] -= amount;
        totalDeposits -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert("AgentVault: transfer failed");
        reputation.mintAttestation(
            agentId, Reputation.ActionType.UNSTAKE, Reputation.Result.SUCCESS, amount, PROTOCOL, WITHDRAW_URI
        );
        emit Withdrawn(msg.sender, amount);
    }
}
