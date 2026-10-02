// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {AgentPassport} from "../src/AgentPassport.sol";

contract AgentPassportTest is Test {
    AgentRegistry internal registry;
    AgentPassport internal passport;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    function setUp() public {
        registry = new AgentRegistry();
        passport = new AgentPassport(registry);

        vm.prank(alice);
        registry.registerAgent("ipfs://agent-1");
    }

    function test_Mint_ByAgentOwner() public {
        vm.expectEmit(address(passport));
        emit Transfer(address(0), alice, 1);

        vm.prank(alice);
        uint256 tokenId = passport.mint(1, "ipfs://passport-1");

        assertEq(tokenId, 1);
        assertEq(passport.ownerOf(1), alice);
        assertEq(passport.balanceOf(alice), 1);
        assertEq(passport.tokenURI(1), "ipfs://passport-1");
        assertEq(passport.agentOf(1), 1);
        assertEq(passport.passportOf(1), 1);
    }

    function test_Mint_OnePassportPerAgent() public {
        vm.startPrank(alice);
        passport.mint(1, "ipfs://passport-1");

        vm.expectRevert("AgentPassport: agent already has passport");
        passport.mint(1, "ipfs://passport-1-again");
        vm.stopPrank();
    }

    function test_Mint_RevertsNotAgentOwner() public {
        vm.prank(bob);
        vm.expectRevert("AgentPassport: not agent owner");
        passport.mint(1, "ipfs://passport-1");
    }

    function test_Mint_RevertsUnknownAgent() public {
        vm.prank(alice);
        vm.expectRevert("AgentRegistry: unknown agent");
        passport.mint(999, "ipfs://x");
    }

    function test_Mint_SeparateTokensPerAgent() public {
        vm.prank(bob);
        registry.registerAgent("ipfs://agent-2");

        vm.prank(alice);
        uint256 tokenA = passport.mint(1, "ipfs://p1");
        vm.prank(bob);
        uint256 tokenB = passport.mint(2, "ipfs://p2");

        assertEq(tokenA, 1);
        assertEq(tokenB, 2);
        assertEq(passport.agentOf(2), 2);
    }

    function test_Transfer_IsTransferable() public {
        vm.prank(alice);
        passport.mint(1, "ipfs://passport-1");

        vm.prank(alice);
        passport.transferFrom(alice, bob, 1);

        assertEq(passport.ownerOf(1), bob);
        assertEq(passport.balanceOf(alice), 0);
        assertEq(passport.balanceOf(bob), 1);
        // Passport stays linked to its agent after transfer.
        assertEq(passport.agentOf(1), 1);
    }

    function test_SetTokenUri_ByTokenOwner() public {
        vm.prank(alice);
        passport.mint(1, "ipfs://passport-1");

        vm.prank(alice);
        passport.setTokenUri(1, "ipfs://passport-1-v2");

        assertEq(passport.tokenURI(1), "ipfs://passport-1-v2");
    }

    function test_SetTokenUri_RevertsNotTokenOwner() public {
        vm.prank(alice);
        passport.mint(1, "ipfs://passport-1");

        vm.prank(bob);
        vm.expectRevert("AgentPassport: not token owner");
        passport.setTokenUri(1, "ipfs://evil");
    }

    function test_AgentOf_RevertsUnknownToken() public {
        vm.expectRevert("AgentPassport: invalid token id");
        passport.agentOf(999);
    }

    function test_PassportOf_RevertsAgentWithoutPassport() public {
        vm.expectRevert("AgentPassport: agent has no passport");
        passport.passportOf(1);
    }
}
