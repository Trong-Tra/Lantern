// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {SeedAgents} from "../script/SeedAgents.s.sol";
import {DualRegister, ICanonicalIdentityRegistry} from "../script/DualRegister.s.sol";

/// @dev In-memory stand-in for the canonical Fuji ERC-8004 singleton —
///      same surface DualRegister touches, ids starting at 307 like the
///      live registry's next id (verified 2026-11-18).
contract MockCanonicalRegistry is ICanonicalIdentityRegistry {
    uint256 private _next = 307;
    mapping(uint256 agentId => address) private _owners;
    mapping(uint256 agentId => string) private _uris;
    mapping(address owner => uint256) public override balanceOf;

    function register(string calldata uri) external returns (uint256 agentId) {
        agentId = _next++;
        _owners[agentId] = msg.sender;
        _uris[agentId] = uri;
        balanceOf[msg.sender] += 1;
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        return _owners[agentId];
    }

    function tokenURI(uint256 agentId) external view returns (string memory) {
        return _uris[agentId];
    }
}

/// @notice Validates the dual-registration pipeline in-memory: same seed
///         JSON, same registerFromJson / buildMappingJson code paths as the
///         broadcast script — zero chain writes.
contract DualRegisterTest is Test {
    AgentRegistry internal registry;
    DualRegister internal dual;
    MockCanonicalRegistry internal canonical;
    string internal seedJson;

    function setUp() public {
        registry = new AgentRegistry();
        dual = new DualRegister();
        canonical = new MockCanonicalRegistry();
        seedJson = vm.readFile("script/seed/agents.json");

        // Seed our registry exactly like SeedAgents does on Fuji.
        new SeedAgents().registerFromJson(registry, seedJson);
    }

    function test_RegistersAllFifteenOnCanonical() public {
        (uint256[] memory ourIds, uint256[] memory canonicalIds) =
            dual.registerFromJson(canonical, registry, seedJson, "");

        assertEq(ourIds.length, 15, "all MVP agents must map");
        assertEq(canonicalIds.length, 15);
        for (uint256 i = 0; i < 15; i++) {
            assertEq(ourIds[i], i + 1, "our ids follow seed order");
            assertEq(canonicalIds[i], 307 + i, "canonical ids allocated sequentially");
            // register() was called from the DualRegister contract here;
            // in broadcast mode startBroadcast makes the EOA the caller.
            assertEq(canonical.ownerOf(canonicalIds[i]), address(dual));
        }
        assertEq(canonical.balanceOf(address(dual)), 15);
    }

    function test_CanonicalTokenUriIsResolvableDataUri() public {
        (, uint256[] memory canonicalIds) = dual.registerFromJson(canonical, registry, seedJson, "");
        string memory uri = canonical.tokenURI(canonicalIds[0]);
        assertEq(
            _startsWith(uri, "data:application/json;base64,"), true,
            "8004scan must resolve the registration file without an off-chain host"
        );
    }

    function test_RegistrationFileShapeMatchesEip8004() public {
        string memory json = dual.registrationFileJson("Yield Keeper", "Neutral description.");
        assertEq(
            vm.parseJsonString(json, ".type"),
            "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
            "type is EIP-8004 v1"
        );
        assertEq(vm.parseJsonString(json, ".name"), "Yield Keeper");
        assertEq(vm.parseJsonString(json, ".description"), "Neutral description.");

        string memory uri = dual.registrationUri("Yield Keeper", "Neutral description.");
        assertEq(_startsWith(uri, "data:application/json;base64,"), true);
    }

    function test_RegistrationFileRejectsUnsafeJsonChars() public {
        vm.expectRevert("DualRegister: unsafe JSON chars");
        dual.registrationFileJson('bad"name', "desc");
        vm.expectRevert("DualRegister: unsafe JSON chars");
        dual.registrationFileJson("name", "bad\\name");
    }

    function test_SkipsAlreadyMappedAndPreservesExisting() public {
        // Simulate a partial earlier run: ourIds 1..3 already mapped.
        uint256[] memory ourIds = new uint256[](3);
        uint256[] memory canonicalIds = new uint256[](3);
        ourIds[0] = 1;
        ourIds[1] = 2;
        ourIds[2] = 3;
        canonicalIds[0] = 999;
        canonicalIds[1] = 998;
        canonicalIds[2] = 997;
        string memory existing = dual.buildMappingJson(43113, address(registry), address(canonical), ourIds, canonicalIds);

        (uint256[] memory mergedOur, uint256[] memory mergedCanonical) =
            dual.registerFromJson(canonical, registry, seedJson, existing);

        assertEq(mergedOur.length, 15, "merged mapping covers every agent");
        // Existing entries preserved verbatim, in file order.
        for (uint256 i = 0; i < 3; i++) {
            assertEq(mergedOur[i], i + 1);
            assertEq(mergedCanonical[i], 999 - i, "existing canonical ids must not be re-registered");
        }
        // Only the 12 missing agents hit the canonical registry.
        assertEq(canonical.balanceOf(address(dual)), 12);
        assertEq(mergedCanonical[3], 307, "new registrations start at the mock's next id");
        assertEq(mergedOur[14], 15);
        assertEq(mergedCanonical[14], 318);
    }

    function test_RevertsWhenSeedAndRegistryDisagree() public {
        // Registry seeded with a different uri than the seed file for id 1.
        AgentRegistry mismatched = new AgentRegistry();
        mismatched.registerAgent("demo://lantern/not-yield-keeper");

        vm.expectRevert("DualRegister: seed/registry mismatch");
        dual.registerFromJson(canonical, mismatched, seedJson, "");
    }

    function test_RevertsWhenRegistryIsMissingAgents() public {
        AgentRegistry empty = new AgentRegistry();
        vm.expectRevert("DualRegister: seed/registry mismatch");
        dual.registerFromJson(canonical, empty, seedJson, "");
    }

    function test_BuildMappingJsonRoundTrips() public view {
        uint256[] memory ourIds = new uint256[](2);
        uint256[] memory canonicalIds = new uint256[](2);
        ourIds[0] = 1;
        ourIds[1] = 15;
        canonicalIds[0] = 307;
        canonicalIds[1] = 321;

        string memory json = dual.buildMappingJson(43113, address(registry), address(canonical), ourIds, canonicalIds);

        assertEq(vm.parseJsonUint(json, ".chainId"), 43113);
        assertEq(vm.parseJsonString(json, ".ourRegistry"), vm.toString(address(registry)));
        assertEq(vm.parseJsonString(json, ".identityRegistry"), vm.toString(address(canonical)));
        assertEq(vm.parseJsonUint(json, ".count"), 2);
        assertEq(vm.parseJsonUint(json, ".agents[0].ourId"), 1);
        assertEq(vm.parseJsonUint(json, ".agents[0].canonicalTokenId"), 307);
        assertEq(vm.parseJsonUint(json, ".agents[1].ourId"), 15);
        assertEq(vm.parseJsonUint(json, ".agents[1].canonicalTokenId"), 321);
    }

    function test_OrphanGuardRejectsTokensWithoutMapping() public {
        // Operator already holds a canonical token but no mapping file exists.
        canonical.register("data:application/json;base64,e30="); // owner = this test
        vm.expectRevert(unicode"DualRegister: canonical tokens exist without mapping — investigate");
        dual.requireNoOrphans(canonical, address(this), "");

        // With a mapping file present (even empty agents list) the guard passes —
        // the file's existence means the operator investigated.
        dual.requireNoOrphans(canonical, address(this), '{"chainId":43113,"count":0,"agents":[]}');
    }

    function test_OrphanGuardAllowsFreshOperator() public view {
        dual.requireNoOrphans(canonical, address(this), "");
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
