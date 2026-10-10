// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Reputation} from "../src/Reputation.sol";

/// @title SeedAttestations
/// @notice Mints the fictional demo attestation history (script/seed/attestations.json)
///         for agents 1-5 so the Explorer/Snap demo has realistic reputation data.
///         Same quarantine rules as agents.json (docs/06): everything demo://.
///
/// Usage (from contracts/, after the deployer is a minter — agent owner or executor):
///   forge script script/SeedAttestations.s.sol:SeedAttestations --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
///
/// The mint loop lives in {mintFromJson} so tests can exercise the exact same
/// code path in-memory without broadcasting anything.
contract SeedAttestations is Script {
    string constant SEED_PATH = "script/seed/attestations.json";
    uint256 constant MAX_ATTESTATIONS = 500; // sanity guard against a runaway JSON

    /// @notice Reads the seed JSON and mints every attestation via `reputation`.
    ///         Caller must be the agent owner or an authorized executor.
    /// @return tokenIds The minted token ids, in seed order.
    function mintFromJson(Reputation reputation, string memory json) public returns (uint256[] memory tokenIds) {
        uint256 count = vm.parseJsonUint(json, ".count");
        if (count == 0) revert("SeedAttestations: empty seed");
        if (count > MAX_ATTESTATIONS) revert("SeedAttestations: count exceeds MAX_ATTESTATIONS");

        tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            string memory base = string.concat(".attestations[", vm.toString(i), "]");
            uint256 agentId = vm.parseJsonUint(json, string.concat(base, ".agentId"));
            Reputation.ActionType actionType =
                _parseActionType(vm.parseJsonString(json, string.concat(base, ".actionType")));
            Reputation.Result result = _parseResult(vm.parseJsonString(json, string.concat(base, ".result")));
            uint256 amount = vm.parseJsonUint(json, string.concat(base, ".amount"));
            string memory protocol = vm.parseJsonString(json, string.concat(base, ".protocol"));
            string memory uri = vm.parseJsonString(json, string.concat(base, ".uri"));

            tokenIds[i] = reputation.mintAttestation(agentId, actionType, result, amount, protocol, uri);
        }
    }

    function run() external {
        Reputation reputation =
            Reputation(vm.envOr("REPUTATION_ADDRESS", address(0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8)));
        string memory json = vm.readFile(SEED_PATH);

        vm.startBroadcast(vm.envUint("MONAD_PRIVATE_KEY"));
        uint256[] memory tokenIds = mintFromJson(reputation, json);
        vm.stopBroadcast();

        console.log("Minted", tokenIds.length, "attestations");
        console.log("First tokenId:", tokenIds[0]);
        console.log("Last tokenId:", tokenIds[tokenIds.length - 1]);
    }

    function _parseActionType(string memory value) internal pure returns (Reputation.ActionType) {
        bytes32 hashed = keccak256(bytes(value));
        if (hashed == keccak256("STAKE")) return Reputation.ActionType.STAKE;
        if (hashed == keccak256("UNSTAKE")) return Reputation.ActionType.UNSTAKE;
        if (hashed == keccak256("HARVEST")) return Reputation.ActionType.HARVEST;
        if (hashed == keccak256("SWAP")) return Reputation.ActionType.SWAP;
        revert("SeedAttestations: unknown actionType");
    }

    function _parseResult(string memory value) internal pure returns (Reputation.Result) {
        bytes32 hashed = keccak256(bytes(value));
        if (hashed == keccak256("SUCCESS")) return Reputation.Result.SUCCESS;
        if (hashed == keccak256("FAIL")) return Reputation.Result.FAIL;
        revert("SeedAttestations: unknown result");
    }
}
