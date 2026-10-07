// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {SeedAgents} from "../script/SeedAgents.s.sol";

/// @notice Validates the seed pipeline entirely in-memory: same JSON, same
///         registerFromJson code path as the broadcast script — zero chain writes.
contract SeedAgentsTest is Test {
    AgentRegistry internal registry;
    SeedAgents internal seeder;
    string internal json;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string uri);

    function setUp() public {
        registry = new AgentRegistry();
        seeder = new SeedAgents();
        json = vm.readFile("script/seed/agents.json");
    }

    function test_SeedRegistersAllMvpIdentities() public {
        uint256[] memory ids = seeder.registerFromJson(registry, json);

        assertEq(ids.length, 15, "MVP seed must register 15 identities");
        assertEq(ids[0], 1);
        assertEq(ids[ids.length - 1], 15);

        for (uint256 i = 0; i < ids.length; i++) {
            // Single-operator MVP: every identity owned by the seeder contract here
            // (the broadcast script registers from the operator wallet instead).
            assertEq(registry.ownerOf(ids[i]), address(seeder));
            string memory uri = registry.agentURI(ids[i]);
            assertEq(bytes(uri).length > 0, true, "uri must not be empty");
        }
    }

    function test_SeedUrisAreDemoSchemeAndUnique() public {
        uint256[] memory ids = seeder.registerFromJson(registry, json);

        for (uint256 i = 0; i < ids.length; i++) {
            string memory uri = registry.agentURI(ids[i]);
            assertEq(
                _startsWith(uri, "demo://"), true,
                "seed URIs must stay on the non-resolvable demo:// scheme"
            );
            for (uint256 j = 0; j < i; j++) {
                assertTrue(
                    keccak256(bytes(uri)) != keccak256(bytes(registry.agentURI(ids[j]))),
                    "seed URIs must be unique"
                );
            }
        }
    }

    function test_SeedEmitsAgentRegisteredPerIdentity() public {
        vm.expectEmit(address(registry));
        emit AgentRegistered(1, address(seeder), "demo://lantern/yield-keeper");
        seeder.registerFromJson(registry, json);
    }

    function test_SeedRevertsOnEmptyCount() public {
        string memory bad = '{"count": 0, "agents": []}';
        vm.expectRevert("SeedAgents: empty seed");
        seeder.registerFromJson(registry, bad);
    }

    function _startsWith(string memory value, string memory prefix)
        internal
        pure
        returns (bool)
    {
        bytes memory v = bytes(value);
        bytes memory p = bytes(prefix);
        if (v.length < p.length) return false;
        for (uint256 i = 0; i < p.length; i++) {
            if (v[i] != p[i]) return false;
        }
        return true;
    }
}
