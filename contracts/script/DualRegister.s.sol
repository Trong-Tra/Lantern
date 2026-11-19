// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

/// @notice Minimal surface of the canonical ERC-8004 identity registry
///         (Fuji singleton) used by {DualRegister}.
interface ICanonicalIdentityRegistry {
    function register(string calldata agentURI) external returns (uint256 agentId);
    function ownerOf(uint256 agentId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
}

/// @title DualRegister
/// @notice Dual-registration (MEMORY 2026-11-15, option 1): registers every
///         seeded Lantern agent on the canonical ERC-8004 Fuji singleton so
///         8004scan can index them, and records our agent id -> canonical
///         token id into script/seed/dual-registered.json (the mapping the
///         Go API serves as Agent.canonicalTokenId).
///
///         Our AgentRegistry stays the market's ownership source of truth;
///         this script only mirrors identity onto the canonical registry.
///         Registration files are base64 data: URIs per EIP-8004 (the
///         demo:// URIs in our registry do not resolve on 8004scan).
///
/// Usage (from contracts/, after SeedAgents — env from repo-root .env):
///   forge script script/DualRegister.s.sol:DualRegister --rpc-url $AVAX_FUJI_RPC_URL --broadcast
///
/// Idempotent: ourIds already present in the mapping file are skipped, so a
/// re-run only registers missing agents. The {registerFromJson} loop and the
/// mapping builder live outside {run} so tests exercise them in-memory.
contract DualRegister is Script {
    string constant SEED_PATH = "script/seed/agents.json";
    string constant MAPPING_PATH = "script/seed/dual-registered.json";
    uint256 constant MAX_AGENTS = 100; // sanity guard against a runaway JSON

    /// @dev Canonical ERC-8004 identity registry on Avalanche Fuji 43113 —
    ///      the singleton 8004scan indexes (verified live 2026-11-18:
    ///      getVersion() = "2.0.0", register(string) selector f2c298be).
    address constant FUJI_IDENTITY_REGISTRY = 0x8004A818BFB912233c491871b3d84c89A494BD9e;

    string constant REGISTRATION_TYPE = "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";
    string constant DATA_URI_PREFIX = "data:application/json;base64,";

    /// @notice EIP-8004 registration file for one Lantern agent.
    ///         Description is a neutral cross-reference to our registry —
    ///         the seed bios carry pre-pivot demo copy and stay local.
    function registrationFileJson(string memory name, string memory description)
        public
        pure
        returns (string memory)
    {
        _requireJsonSafe(name);
        _requireJsonSafe(description);
        return string.concat(
            '{"type":"', REGISTRATION_TYPE,
            '","name":"', name,
            '","description":"', description, '"}'
        );
    }

    /// @notice The agentURI stored on the canonical registry: an
    ///         on-chain data: URI so 8004scan can resolve it without any
    ///         off-chain host.
    function registrationUri(string memory name, string memory description)
        public
        returns (string memory)
    {
        return string.concat(DATA_URI_PREFIX, vm.toBase64(registrationFileJson(name, description)));
    }

    /// @notice Registers every not-yet-mapped seed agent on `canonical`.
    ///         Guards: seed JSON must match our registry's stored URIs
    ///         (our agent id = seed order), so a differently-seeded registry
    ///         can never produce a wrong id mapping.
    /// @param existingMappingJson Current mapping file contents ("" when none);
    ///        its entries are preserved verbatim in the merged result.
    /// @return ourIds Merged Lantern agent ids (existing file order, then new).
    /// @return canonicalIds Merged canonical token ids aligned with `ourIds`.
    function registerFromJson(
        ICanonicalIdentityRegistry canonical,
        AgentRegistry ours,
        string memory seedJson,
        string memory existingMappingJson
    ) public returns (uint256[] memory ourIds, uint256[] memory canonicalIds) {
        uint256 count = vm.parseJsonUint(seedJson, ".count");
        if (count == 0) revert("DualRegister: empty seed");
        if (count > MAX_AGENTS) revert("DualRegister: count exceeds MAX_AGENTS");

        (uint256[] memory keptOur, uint256[] memory keptCanonical) = _parseExisting(existingMappingJson);

        // Pass 1: count seed agents still needing registration.
        uint256 newCount = 0;
        for (uint256 i = 0; i < count; i++) {
            if (!_containsUint(keptOur, i + 1)) newCount++;
        }

        ourIds = new uint256[](keptOur.length + newCount);
        canonicalIds = new uint256[](keptOur.length + newCount);
        for (uint256 j = 0; j < keptOur.length; j++) {
            ourIds[j] = keptOur[j];
            canonicalIds[j] = keptCanonical[j];
        }

        // Pass 2: verify seed vs our registry, then register on canonical.
        uint256 idx = keptOur.length;
        for (uint256 i = 0; i < count; i++) {
            uint256 ourId = i + 1;
            if (_containsUint(keptOur, ourId)) continue;
            ourIds[idx] = ourId;
            canonicalIds[idx] = _registerSeedAgent(canonical, ours, seedJson, i, ourId);
            idx++;
        }
    }

    /// @dev Existing mapping file -> parallel arrays (file order, verbatim).
    function _parseExisting(string memory existingMappingJson)
        private
        pure
        returns (uint256[] memory keptOur, uint256[] memory keptCanonical)
    {
        uint256 existingCount = bytes(existingMappingJson).length == 0
            ? 0
            : vm.parseJsonUint(existingMappingJson, ".count");
        keptOur = new uint256[](existingCount);
        keptCanonical = new uint256[](existingCount);
        for (uint256 j = 0; j < existingCount; j++) {
            keptOur[j] = vm.parseJsonUint(
                existingMappingJson, string.concat(".agents[", vm.toString(j), "].ourId")
            );
            keptCanonical[j] = vm.parseJsonUint(
                existingMappingJson, string.concat(".agents[", vm.toString(j), "].canonicalTokenId")
            );
        }
    }

    /// @dev One seed agent: registry URI must equal the seed URI (our agent
    ///      id = seed order), then register the data-URI on canonical.
    function _registerSeedAgent(
        ICanonicalIdentityRegistry canonical,
        AgentRegistry ours,
        string memory seedJson,
        uint256 i,
        uint256 ourId
    ) private returns (uint256 canonicalId) {
        string memory seedUri = vm.parseJsonString(
            seedJson, string.concat(".agents[", vm.toString(i), "].uri")
        );
        string memory actual;
        try ours.agentURI(ourId) returns (string memory uri) {
            actual = uri;
        } catch {
            revert("DualRegister: seed/registry mismatch");
        }
        if (keccak256(bytes(actual)) != keccak256(bytes(seedUri))) {
            revert("DualRegister: seed/registry mismatch");
        }

        string memory name = vm.parseJsonString(
            seedJson, string.concat(".agents[", vm.toString(i), "].name")
        );
        string memory description = string.concat(
            unicode"Lantern Finance solver agent on Avalanche Fuji — AgentRegistry agent #",
            vm.toString(ourId),
            " (",
            vm.toString(address(ours)),
            ")"
        );
        return canonical.register(registrationUri(name, description));
    }

    /// @notice Merged mapping JSON for {MAPPING_PATH} — ids are JSON numbers
    ///         (small, JS-safe); the Go API serves them as GraphQL ID strings.
    function buildMappingJson(
        uint256 chainId,
        address ourRegistry,
        address canonicalRegistry,
        uint256[] memory ourIds,
        uint256[] memory canonicalIds
    ) public pure returns (string memory) {
        string memory json = string.concat(
            '{"chainId":', vm.toString(chainId),
            ',"identityRegistry":"', vm.toString(canonicalRegistry),
            '","ourRegistry":"', vm.toString(ourRegistry),
            '","count":', vm.toString(ourIds.length),
            ',"agents":['
        );
        for (uint256 i = 0; i < ourIds.length; i++) {
            if (i > 0) json = string.concat(json, ",");
            json = string.concat(
                json,
                '{"ourId":', vm.toString(ourIds[i]),
                ',"canonicalTokenId":', vm.toString(canonicalIds[i]),
                "}"
            );
        }
        return string.concat(json, "]}");
    }

    /// @notice Partial-run guard: canonical tokens held by the operator with
    ///         no mapping file means a previous broadcast died before the
    ///         mapping was written — re-registering would silently duplicate.
    function requireNoOrphans(
        ICanonicalIdentityRegistry canonical,
        address operator,
        string memory existingMappingJson
    ) public view {
        if (bytes(existingMappingJson).length == 0 && canonical.balanceOf(operator) > 0) {
            revert(unicode"DualRegister: canonical tokens exist without mapping — investigate");
        }
    }

    function run() external {
        AgentRegistry ours = AgentRegistry(vm.envAddress("AGENT_REGISTRY_ADDRESS"));
        ICanonicalIdentityRegistry canonical = ICanonicalIdentityRegistry(FUJI_IDENTITY_REGISTRY);
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        string memory seedJson = vm.readFile(SEED_PATH);
        string memory existing = vm.exists(MAPPING_PATH) ? vm.readFile(MAPPING_PATH) : "";
        requireNoOrphans(canonical, deployer, existing);

        uint256 existingCount = bytes(existing).length == 0 ? 0 : vm.parseJsonUint(existing, ".count");

        vm.startBroadcast(deployerKey);
        (uint256[] memory ourIds, uint256[] memory canonicalIds) =
            registerFromJson(canonical, ours, seedJson, existing);
        vm.stopBroadcast();

        vm.writeFile(
            MAPPING_PATH,
            buildMappingJson(block.chainid, address(ours), address(canonical), ourIds, canonicalIds)
        );

        console.log("Mapped agents (existing + new):", ourIds.length);
        console.log("Already mapped:", existingCount);
        console.log("Registered this run:", ourIds.length - existingCount);
        for (uint256 i = 0; i < ourIds.length; i++) {
            console.log("  ourId -> canonicalTokenId:", ourIds[i], canonicalIds[i]);
        }
    }

    function _containsUint(uint256[] memory arr, uint256 needle) private pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == needle) return true;
        }
        return false;
    }

    /// @dev Registration JSON is hand-built; reject characters that would
    ///      break it rather than implement escaping (seed data is ours).
    function _requireJsonSafe(string memory value) private pure {
        bytes memory raw = bytes(value);
        for (uint256 i = 0; i < raw.length; i++) {
            bytes1 c = raw[i];
            if (c == '"' || c == "\\") revert("DualRegister: unsafe JSON chars");
        }
    }
}
