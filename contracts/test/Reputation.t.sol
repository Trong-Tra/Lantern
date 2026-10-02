// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";

contract ReputationTest is Test {
    AgentRegistry internal registry;
    Reputation internal reputation;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal executor = makeAddr("executor");

    event AttestationMinted(
        uint256 indexed agentId,
        uint256 indexed tokenId,
        Reputation.ActionType actionType,
        Reputation.Result result
    );
    event Locked(uint256 tokenId);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function setUp() public {
        registry = new AgentRegistry();
        reputation = new Reputation(registry);

        vm.prank(alice);
        registry.registerAgent("ipfs://agent-1");
    }

    function _mintDefault() internal returns (uint256) {
        vm.prank(alice);
        return reputation.mintAttestation(
            1, Reputation.ActionType.STAKE, Reputation.Result.SUCCESS, 100e18, "mono", "ipfs://att-1"
        );
    }

    // --- minting ---

    function test_Mint_ByAgentOwner() public {
        // Emission order: _mint (Transfer), then AttestationMinted, then Locked.
        vm.expectEmit(address(reputation));
        emit Transfer(address(0), alice, 1);
        vm.expectEmit(address(reputation));
        emit AttestationMinted(1, 1, Reputation.ActionType.STAKE, Reputation.Result.SUCCESS);
        vm.expectEmit(address(reputation));
        emit Locked(1);

        uint256 tokenId = _mintDefault();

        assertEq(tokenId, 1);
        assertEq(reputation.ownerOf(1), alice);

        Reputation.Attestation memory att = reputation.getAttestation(1);
        assertEq(att.agentId, 1);
        assertEq(uint256(att.actionType), uint256(Reputation.ActionType.STAKE));
        assertEq(uint256(att.result), uint256(Reputation.Result.SUCCESS));
        assertEq(att.amount, 100e18);
        assertEq(att.protocol, "mono");
        assertEq(att.uri, "ipfs://att-1");
    }

    function test_Mint_FailureAlsoMints() public {
        vm.prank(alice);
        uint256 tokenId = reputation.mintAttestation(
            1, Reputation.ActionType.SWAP, Reputation.Result.FAIL, 5e18, "uni", "ipfs://att-fail"
        );

        Reputation.Attestation memory att = reputation.getAttestation(tokenId);
        assertEq(uint256(att.result), uint256(Reputation.Result.FAIL));
        assertEq(reputation.ownerOf(tokenId), alice);
    }

    function test_Mint_ByAuthorizedExecutor() public {
        reputation.setExecutor(executor, true);
        assertTrue(reputation.executors(executor));

        vm.prank(executor);
        uint256 tokenId = reputation.mintAttestation(
            1, Reputation.ActionType.HARVEST, Reputation.Result.SUCCESS, 7e18, "mono", "ipfs://att-2"
        );

        // Soulbound token still belongs to the agent's owner, not the executor.
        assertEq(reputation.ownerOf(tokenId), alice);
    }

    function test_Mint_RevertsUnauthorizedCaller() public {
        vm.prank(bob);
        vm.expectRevert("Reputation: not minter");
        reputation.mintAttestation(1, Reputation.ActionType.STAKE, Reputation.Result.SUCCESS, 1, "p", "u");
    }

    function test_Mint_RevertsAfterExecutorRevoked() public {
        reputation.setExecutor(executor, true);
        reputation.setExecutor(executor, false);

        vm.prank(executor);
        vm.expectRevert("Reputation: not minter");
        reputation.mintAttestation(1, Reputation.ActionType.STAKE, Reputation.Result.SUCCESS, 1, "p", "u");
    }

    function test_Mint_RevertsUnknownAgent() public {
        vm.prank(alice);
        vm.expectRevert("AgentRegistry: unknown agent");
        reputation.mintAttestation(999, Reputation.ActionType.STAKE, Reputation.Result.SUCCESS, 1, "p", "u");
    }

    // --- ERC-5192 soulbound ---

    function test_Locked_IsTrue() public {
        _mintDefault();
        assertTrue(reputation.locked(1));
    }

    function test_Locked_RevertsUnknownToken() public {
        vm.expectRevert("ERC721: invalid token id");
        reputation.locked(999);
    }

    function test_TransferFrom_RevertsSoulbound() public {
        _mintDefault();

        vm.prank(alice);
        vm.expectRevert("Reputation: soulbound");
        reputation.transferFrom(alice, bob, 1);
    }

    function test_SafeTransferFrom_RevertsSoulbound() public {
        _mintDefault();

        vm.prank(alice);
        vm.expectRevert("Reputation: soulbound");
        reputation.safeTransferFrom(alice, bob, 1);
    }

    function test_TransferFrom_RevertsEvenForApproved() public {
        _mintDefault();

        vm.startPrank(alice);
        reputation.approve(bob, 1);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert("Reputation: soulbound");
        reputation.transferFrom(alice, bob, 1);
    }

    // --- access control ---

    function test_SetExecutor_OnlyOwner() public {
        vm.prank(bob);
        vm.expectRevert("Ownable: not owner");
        reputation.setExecutor(bob, true);
    }

    function test_SetExecutor_OwnerWorks() public {
        // Deployer (test contract) is owner.
        reputation.setExecutor(executor, true);
        assertTrue(reputation.executors(executor));
    }

    // --- views ---

    function test_TokenURI_ReturnsAttestationUri() public {
        _mintDefault();
        assertEq(reputation.tokenURI(1), "ipfs://att-1");
    }

    function test_GetAttestation_RevertsUnknownToken() public {
        vm.expectRevert("ERC721: invalid token id");
        reputation.getAttestation(999);
    }

    function test_Mints_IncrementTokenIds() public {
        uint256 first = _mintDefault();
        vm.prank(alice);
        uint256 second = reputation.mintAttestation(
            1, Reputation.ActionType.UNSTAKE, Reputation.Result.SUCCESS, 50e18, "mono", "ipfs://att-2"
        );

        assertEq(first, 1);
        assertEq(second, 2);
        assertEq(reputation.balanceOf(alice), 2);
    }
}
