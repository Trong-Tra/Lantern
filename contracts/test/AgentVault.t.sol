// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";
import {AgentVault} from "../src/AgentVault.sol";

/// @notice Tests for the demo AgentVault: deposits/withdrawals, attestation
///         minting, and executor access control.
contract AgentVaultTest is Test {
    AgentRegistry internal registry;
    Reputation internal reputation;
    AgentVault internal vault;
    address internal alice = makeAddr("alice");

    function setUp() public {
        registry = new AgentRegistry();
        reputation = new Reputation(registry);
        registry.registerAgent("demo://lantern/yield-keeper"); // agent 1
        vault = new AgentVault(registry, reputation, 1);
        reputation.setExecutor(address(vault), true);
        vm.deal(alice, 10 ether);
    }

    function test_DepositUpdatesBalancesAndMintsAttestation() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();

        assertEq(vault.balanceOf(alice), 1 ether);
        assertEq(vault.totalDeposits(), 1 ether);
        assertEq(address(vault).balance, 1 ether);

        // First ever attestation is tokenId 1 on a fresh Reputation.
        Reputation.Attestation memory att = reputation.getAttestation(1);
        assertEq(att.agentId, 1);
        assertEq(uint256(att.actionType), uint256(Reputation.ActionType.STAKE));
        assertEq(uint256(att.result), uint256(Reputation.Result.SUCCESS));
        assertEq(att.amount, 1 ether);
        assertEq(att.protocol, "demo://protocols/agent-vault");
        assertEq(att.uri, "demo://vault/deposit");
    }

    function test_WithdrawMintsUnstakeAttestation() public {
        vm.startPrank(alice);
        vault.deposit{value: 2 ether}();
        vault.withdraw(0.5 ether);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice), 1.5 ether);
        assertEq(vault.totalDeposits(), 1.5 ether);
        assertEq(alice.balance, 8.5 ether);

        Reputation.Attestation memory att = reputation.getAttestation(2);
        assertEq(uint256(att.actionType), uint256(Reputation.ActionType.UNSTAKE));
        assertEq(uint256(att.result), uint256(Reputation.Result.SUCCESS));
        assertEq(att.amount, 0.5 ether);
        assertEq(att.uri, "demo://vault/withdraw");
    }

    function test_ZeroDepositReverts() public {
        vm.prank(alice);
        vm.expectRevert("AgentVault: zero deposit");
        vault.deposit{value: 0}();
    }

    function test_PlainReceiveReverts() public {
        // Low-level call surfaces the revert as ok=false instead of bubbling.
        vm.prank(alice);
        (bool ok,) = address(vault).call{value: 1 ether}("");
        assertFalse(ok);
        assertEq(address(vault).balance, 0);
    }

    function test_WithdrawWithoutBalanceReverts() public {
        vm.prank(alice);
        vm.expectRevert("AgentVault: insufficient balance");
        vault.withdraw(1 ether);
    }

    function test_ZeroWithdrawReverts() public {
        vm.prank(alice);
        vm.expectRevert("AgentVault: zero amount");
        vault.withdraw(0);
    }

    function test_ConstructorRevertsForUnknownAgent() public {
        vm.expectRevert("AgentRegistry: unknown agent");
        new AgentVault(registry, reputation, 99);
    }

    function test_DepositRevertsWhenExecutorNotAuthorized() public {
        AgentVault unauthorized = new AgentVault(registry, reputation, 1);
        vm.prank(alice);
        vm.expectRevert("Reputation: not minter");
        unauthorized.deposit{value: 1 ether}();
    }
}
