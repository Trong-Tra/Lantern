// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry internal registry;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string uri);
    event AgentUpdated(uint256 indexed agentId, string uri);

    function setUp() public {
        registry = new AgentRegistry();
    }

    function test_RegisterAgent() public {
        vm.expectEmit(address(registry));
        emit AgentRegistered(1, alice, "ipfs://agent-1");

        vm.prank(alice);
        uint256 agentId = registry.registerAgent("ipfs://agent-1");

        assertEq(agentId, 1);
        assertEq(registry.ownerOf(1), alice);
        assertEq(registry.agentURI(1), "ipfs://agent-1");
    }

    function test_RegisterAgent_IncrementsIds() public {
        vm.startPrank(alice);
        uint256 first = registry.registerAgent("ipfs://a");
        uint256 second = registry.registerAgent("ipfs://b");
        vm.stopPrank();

        vm.prank(bob);
        uint256 third = registry.registerAgent("ipfs://c");

        assertEq(first, 1);
        assertEq(second, 2);
        assertEq(third, 3);
        assertEq(registry.ownerOf(2), alice);
        assertEq(registry.ownerOf(3), bob);
    }

    function test_OwnerOf_RevertsUnknownAgent() public {
        vm.expectRevert("AgentRegistry: unknown agent");
        registry.ownerOf(999);
    }

    function test_AgentURI_RevertsUnknownAgent() public {
        vm.expectRevert("AgentRegistry: unknown agent");
        registry.agentURI(999);
    }

    function test_SetAgentUri_ByOwner() public {
        vm.prank(alice);
        registry.registerAgent("ipfs://agent-1");

        vm.expectEmit(address(registry));
        emit AgentUpdated(1, "ipfs://agent-1-v2");

        vm.prank(alice);
        registry.setAgentUri(1, "ipfs://agent-1-v2");

        assertEq(registry.agentURI(1), "ipfs://agent-1-v2");
    }

    function test_SetAgentUri_RevertsNotAgentOwner() public {
        vm.prank(alice);
        registry.registerAgent("ipfs://agent-1");

        vm.prank(bob);
        vm.expectRevert("AgentRegistry: not agent owner");
        registry.setAgentUri(1, "ipfs://evil");
    }

    function test_SetAgentUri_RevertsUnknownAgent() public {
        vm.prank(alice);
        vm.expectRevert("AgentRegistry: unknown agent");
        registry.setAgentUri(42, "ipfs://x");
    }
}
