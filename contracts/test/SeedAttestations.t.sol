// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";
import {SeedAttestations} from "../script/SeedAttestations.s.sol";

/// @notice Validates the attestation seed pipeline entirely in-memory: same
///         JSON, same mintFromJson code path as the broadcast script — zero
///         chain writes. The deployer (this test contract) is the owner of
///         agents 1-5, so no executor authorization is needed.
contract SeedAttestationsTest is Test {
    AgentRegistry internal registry;
    Reputation internal reputation;
    SeedAttestations internal seeder;
    string internal json;

    function setUp() public {
        registry = new AgentRegistry();
        reputation = new Reputation(registry);
        for (uint256 i = 0; i < 5; i++) {
            registry.registerAgent("demo://lantern/seed-test");
        }
        seeder = new SeedAttestations();
        // Broadcast reality: the minter must be the agent owner or an executor.
        // Agents are owned by this test contract, so authorize the seeder.
        reputation.setExecutor(address(seeder), true);
        json = vm.readFile("script/seed/attestations.json");
    }

    function test_SeedMintsAllAttestations() public {
        uint256[] memory tokenIds = seeder.mintFromJson(reputation, json);

        uint256 count = vm.parseJsonUint(json, ".count");
        assertEq(tokenIds.length, count, "every seed entry must mint");
        assertEq(tokenIds[0], 1);
        assertEq(tokenIds[tokenIds.length - 1], count);
    }

    function test_SeedFieldsMatchJson() public {
        uint256[] memory tokenIds = seeder.mintFromJson(reputation, json);

        uint256 count = vm.parseJsonUint(json, ".count");
        for (uint256 i = 0; i < count; i++) {
            string memory base = string.concat(".attestations[", vm.toString(i), "]");
            Reputation.Attestation memory att = reputation.getAttestation(tokenIds[i]);
            assertEq(att.agentId, vm.parseJsonUint(json, string.concat(base, ".agentId")));
            assertEq(att.amount, vm.parseJsonUint(json, string.concat(base, ".amount")));
            assertEq(
                uint256(att.actionType),
                _expectedActionType(vm.parseJsonString(json, string.concat(base, ".actionType")))
            );
            assertEq(
                uint256(att.result),
                keccak256(bytes(vm.parseJsonString(json, string.concat(base, ".result")))) == keccak256("SUCCESS")
                    ? 0
                    : 1
            );
            assertEq(att.protocol, vm.parseJsonString(json, string.concat(base, ".protocol")));
            assertEq(att.uri, vm.parseJsonString(json, string.concat(base, ".uri")));
        }
    }

    function test_SeedStaysOnDemoSchemeAndHasFailures() public {
        uint256[] memory tokenIds = seeder.mintFromJson(reputation, json);

        bool sawFail;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            Reputation.Attestation memory att = reputation.getAttestation(tokenIds[i]);
            assertTrue(_startsWith(att.protocol, "demo://"), "protocol must use demo:// scheme");
            assertTrue(_startsWith(att.uri, "demo://"), "uri must use demo:// scheme");
            if (att.result == Reputation.Result.FAIL) sawFail = true;
        }
        assertTrue(sawFail, "demo history must include failures (reputation = earned)");
    }

    function test_SeedRevertsOnEmptyCount() public {
        string memory bad = '{"count": 0, "attestations": []}';
        vm.expectRevert("SeedAttestations: empty seed");
        seeder.mintFromJson(reputation, bad);
    }

    function test_SeedRevertsOnUnknownActionType() public {
        string memory bad =
            '{"count": 1, "attestations": [{"agentId": 1, "actionType": "YOLO", "result": "SUCCESS", "amount": "1", "protocol": "demo://x", "uri": "demo://y"}]}';
        vm.expectRevert("SeedAttestations: unknown actionType");
        seeder.mintFromJson(reputation, bad);
    }

    function test_SeedRevertsOnUnknownResult() public {
        string memory bad =
            '{"count": 1, "attestations": [{"agentId": 1, "actionType": "STAKE", "result": "MAYBE", "amount": "1", "protocol": "demo://x", "uri": "demo://y"}]}';
        vm.expectRevert("SeedAttestations: unknown result");
        seeder.mintFromJson(reputation, bad);
    }

    function _expectedActionType(string memory value) internal pure returns (uint256) {
        bytes32 hashed = keccak256(bytes(value));
        if (hashed == keccak256("STAKE")) return 0;
        if (hashed == keccak256("UNSTAKE")) return 1;
        if (hashed == keccak256("HARVEST")) return 2;
        if (hashed == keccak256("SWAP")) return 3;
        revert("unexpected actionType in seed json");
    }

    function _startsWith(string memory value, string memory prefix) internal pure returns (bool) {
        bytes memory v = bytes(value);
        bytes memory p = bytes(prefix);
        if (v.length < p.length) return false;
        for (uint256 i = 0; i < p.length; i++) {
            if (v[i] != p[i]) return false;
        }
        return true;
    }
}
