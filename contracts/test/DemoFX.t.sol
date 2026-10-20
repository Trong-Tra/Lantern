// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {MockCNY} from "../src/MockCNY.sol";
import {MockSGD} from "../src/MockSGD.sol";
import {DemoFXPool, IMintableERC20} from "../src/DemoFXPool.sol";

/// @notice Local ERC-20 projection so tests can treat the three corridor mocks
///         interchangeably (mirrors the pool's IMintableERC20 surface).
interface IERC20View {
    function approve(address spender, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

/// @notice Tests for the DemoFX corridor: one-shot policy enrollment, the
///         boot leg, the CNY -> USDC -> MON -> SGD agent route with MON-wei
///         attestation amounts, and the policy-gate revert on the 4th hop.
///
///         Foundry note: route getters (`pool.R_*()`) are external calls — they
///         must be evaluated BEFORE `vm.prank` / `vm.expectRevert`, otherwise
///         the getter silently consumes the cheatcode. Route ids are therefore
///         hoisted into locals first.
contract DemoFXTest is Test {
    AgentRegistry internal registry;
    Reputation internal reputation;
    MockUSD internal usdc;
    MockCNY internal cny;
    MockSGD internal sgd;
    DemoFXPool internal pool;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant BOOT_MON = 0.3 ether;
    uint256 internal constant BOOT_CNY = 25_560_000; // 0.3 MON = 25.56 mCNY
    uint256 internal constant HOP1_USDC = 3_600_000; // 25.56 mCNY = 3.6 mUSDC
    uint256 internal constant HOP2_MON = 0.3 ether; // 3.6 mUSDC = 0.3 MON
    uint256 internal constant HOP3_MON = 0.25 ether;
    uint256 internal constant HOP3_SGD = 3_960_000; // 0.25 MON = 3.96 mSGD

    function setUp() public {
        registry = new AgentRegistry();
        reputation = new Reputation(registry);
        registry.registerAgent("demo://lantern/yield-keeper"); // agent 1, owner = this test
        usdc = new MockUSD();
        cny = new MockCNY();
        sgd = new MockSGD();
        pool = new DemoFXPool(
            registry,
            reputation,
            1,
            IMintableERC20(address(usdc)),
            IMintableERC20(address(cny)),
            IMintableERC20(address(sgd))
        );
        usdc.transferOwnership(address(pool));
        cny.transferOwnership(address(pool));
        sgd.transferOwnership(address(pool));
        reputation.setExecutor(address(pool), true);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function _attestationCount() internal view returns (uint256) {
        return reputation.balanceOf(registry.ownerOf(1));
    }

    function _enroll(address wallet) internal {
        vm.prank(wallet);
        pool.enroll(3);
    }

    function _approveMax(address wallet, IERC20View token) internal {
        vm.prank(wallet);
        token.approve(address(pool), type(uint256).max);
    }

    function _boot(address wallet) internal {
        uint8 r = pool.R_MON_CNY();
        vm.prank(wallet);
        pool.swap{value: BOOT_MON}(r, BOOT_MON);
    }

    function test_EnrollStoresPolicyAndEmits() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit DemoFXPool.Enrolled(alice, 3);
        pool.enroll(3);

        (uint16 maxSwaps, uint16 used, bool set) = pool.policies(alice);
        assertEq(maxSwaps, 3);
        assertEq(used, 0);
        assertTrue(set);
    }

    function test_EnrollTwiceReverts() public {
        _enroll(alice);
        vm.prank(alice);
        vm.expectRevert("DemoFX: policy set");
        pool.enroll(5);
    }

    function test_ReEnrollAllowedAfterFullConsumption() public {
        // Same wallet keeps its funds; only its authority is re-granted.
        _boot(alice);
        _enroll(alice);
        uint8 r1 = pool.R_CNY_USDC();
        _approveMax(alice, IERC20View(address(cny)));
        vm.startPrank(alice);
        pool.swap(r1, 1_000_000);
        pool.swap(r1, 1_000_000);
        pool.swap(r1, 1_000_000);
        // exhausted: gate still holds…
        vm.expectRevert("DemoFX: policy exhausted");
        pool.swap(r1, 1_000_000);
        // …but the same wallet can commit a fresh mandate.
        pool.enroll(2);
        vm.stopPrank();

        (uint16 maxSwaps, uint16 used, bool set) = pool.policies(alice);
        assertEq(maxSwaps, 2);
        assertEq(used, 0);
        assertTrue(set);
        console.log("");
        console.log("=== Re-enroll after exhaustion: same wallet, fresh mandate ===");
        console.log("new mandate: max 2 swaps, used 0; wallet funds never left the wallet");
        console.log("wallet mCNY balance intact:", cny.balanceOf(alice));
    }

    function test_EnrollZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert("DemoFX: zero policy");
        pool.enroll(0);
    }

    function test_BootLegNeedsNoPolicyAndDoesNotAttest() public {
        uint8 rBoot = pool.R_MON_CNY();
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit DemoFXPool.PoolSwap(alice, rBoot, 0, 2, BOOT_MON, BOOT_CNY, false);
        pool.swap{value: BOOT_MON}(rBoot, BOOT_MON);

        assertEq(cny.balanceOf(alice), BOOT_CNY);
        assertEq(alice.balance, 9.7 ether); // 10 - 0.3 BOOT_MON
        assertEq(_attestationCount(), 0); // setup is not an agent action
        (, uint16 used,) = pool.policies(alice);
        assertEq(used, 0);
    }

    function test_CountedRouteWithoutPolicyReverts() public {
        uint8 r1 = pool.R_CNY_USDC();
        _approveMax(alice, IERC20View(address(cny)));
        vm.prank(alice);
        vm.expectRevert("DemoFX: no policy");
        pool.swap(r1, BOOT_CNY);
    }

    function test_ThreeHopCorridorEndToEnd() public {
        uint8 r1 = pool.R_CNY_USDC();
        uint8 r2 = pool.R_USDC_MON();
        uint8 r3 = pool.R_MON_SGD();

        console.log("");
        console.log("=== Agent-wallet corridor: fund -> boot -> enroll -> 3 hops ===");
        console.log("route: mCNY -> mUSDC -> MON -> mSGD (amounts in raw token units)");

        // The whole agent-wallet demo in one wallet: fund -> boot -> enroll -> 3 hops.
        _boot(alice);
        console.log("boot leg MON->mCNY (no policy needed): mCNY balance:", cny.balanceOf(alice));
        _enroll(alice);
        console.log("mandate enrolled: max 3 counted swaps, wallet funds untouched");
        _approveMax(alice, IERC20View(address(cny)));
        _approveMax(alice, IERC20View(address(usdc)));

        uint256 attId = _attestationCount(); // 0 in a fresh setup

        // hop 1: all CNY -> USDC
        vm.prank(alice);
        pool.swap(r1, BOOT_CNY);
        assertEq(usdc.balanceOf(alice), HOP1_USDC);
        assertEq(cny.balanceOf(alice), 0);

        console.log("hop 1 mCNY->mUSDC: in", BOOT_CNY, "out", usdc.balanceOf(alice));

        Reputation.Attestation memory att = reputation.getAttestation(attId + 1);
        assertEq(att.agentId, 1);
        assertEq(uint256(att.actionType), uint256(Reputation.ActionType.SWAP));
        assertEq(uint256(att.result), uint256(Reputation.Result.SUCCESS));
        assertEq(att.amount, 0.3 ether); // normalized: 25.56 mCNY == 0.3 MON-wei
        assertEq(att.protocol, "demo://protocols/demo-fx");
        assertEq(att.uri, "demo://demofx/corridor-swap");
        console.log("  attestation #1: agent 1 SWAP SUCCESS, amount (MON wei):", att.amount);

        // hop 2: all USDC -> MON (native out, paid from the pool's boot reserves)
        uint256 balanceBefore = alice.balance;
        vm.prank(alice);
        pool.swap(r2, HOP1_USDC);
        assertEq(alice.balance - balanceBefore, HOP2_MON);
        assertEq(usdc.balanceOf(alice), 0);
        assertEq(reputation.getAttestation(attId + 2).amount, 0.3 ether);
        console.log("hop 2 mUSDC->MON: in", HOP1_USDC, "out (MON wei):", HOP2_MON);
        console.log("  attestation #2: agent 1 SWAP SUCCESS, amount (MON wei):", reputation.getAttestation(attId + 2).amount);

        // hop 3: part of the MON -> SGD (native input must ride along as value)
        vm.prank(alice);
        pool.swap{value: HOP3_MON}(r3, HOP3_MON);
        assertEq(sgd.balanceOf(alice), HOP3_SGD);
        assertEq(reputation.getAttestation(attId + 3).amount, HOP3_MON);
        console.log("hop 3 MON->mSGD: in (MON wei):", HOP3_MON, "out", sgd.balanceOf(alice));
        console.log("  attestation #3: agent 1 SWAP SUCCESS, amount (MON wei):", reputation.getAttestation(attId + 3).amount);

        (, uint16 used,) = pool.policies(alice);
        assertEq(used, 3);
        assertEq(_attestationCount(), 3);
        console.log("mandate consumed: 3/3 swaps used; attestations minted:", _attestationCount());
        console.log("wallet mSGD balance (raw):", sgd.balanceOf(alice));
    }

    function test_FourthAgentSwapRevertsExhausted() public {
        uint8 r1 = pool.R_CNY_USDC();
        _boot(alice);
        _enroll(alice);
        _approveMax(alice, IERC20View(address(cny)));

        vm.startPrank(alice);
        pool.swap(r1, 1_000_000); // 1 mCNY
        pool.swap(r1, 1_000_000);
        pool.swap(r1, 1_000_000);
        vm.stopPrank();
        uint256 cnyBeforeBlocked = cny.balanceOf(alice); // after exactly 3 successful hops

        vm.startPrank(alice);
        vm.expectRevert("DemoFX: policy exhausted");
        pool.swap(r1, 1_000_000);
        vm.stopPrank();

        console.log("");
        console.log("=== Policy gate: 4th swap attempted inside a 3-swap mandate ===");
        console.log("gate reverted 'DemoFX: policy exhausted' BEFORE any state change");
        console.log("wallet mCNY unchanged after blocked attempt:", cny.balanceOf(alice) == cnyBeforeBlocked);

        (, uint16 used,) = pool.policies(alice);
        assertEq(used, 3);
        console.log("mandate state: used 3/3 (the blocked attempt did not consume a swap)");
    }

    function test_UnknownRouteReverts() public {
        vm.prank(alice);
        vm.expectRevert("DemoFX: unknown route");
        pool.swap{value: 1 ether}(9, 1 ether);
    }

    function test_WrongValueReverts() public {
        uint8 rBoot = pool.R_MON_CNY();
        uint8 r1 = pool.R_CNY_USDC();
        vm.prank(alice);
        vm.expectRevert("DemoFX: wrong value"); // native leg with short value
        pool.swap{value: 0.2 ether}(rBoot, BOOT_MON);

        _enroll(alice);
        vm.prank(alice);
        vm.expectRevert("DemoFX: unexpected value"); // token leg with value attached
        pool.swap{value: 1 ether}(r1, BOOT_CNY);
    }

    function test_ZeroAmountReverts() public {
        uint8 r1 = pool.R_CNY_USDC();
        vm.prank(alice);
        vm.expectRevert("DemoFX: zero amount");
        pool.swap(r1, 0);
    }

    function test_PlainReceiveReverts() public {
        vm.prank(alice);
        (bool ok,) = address(pool).call{value: 1 ether}("");
        assertFalse(ok);
        assertEq(address(pool).balance, 0);
    }

    function test_ConstructorRevertsForUnknownAgent() public {
        vm.expectRevert("AgentRegistry: unknown agent");
        new DemoFXPool(
            registry,
            reputation,
            99,
            IMintableERC20(address(usdc)),
            IMintableERC20(address(cny)),
            IMintableERC20(address(sgd))
        );
    }

    function test_UnfundedPoolNativeLegReverts() public {
        uint8 r1 = pool.R_CNY_USDC();
        uint8 r2 = pool.R_USDC_MON();
        // A second pool that never received the boot leg has no MON reserves.
        DemoFXPool dryPool = new DemoFXPool(
            registry,
            reputation,
            1,
            IMintableERC20(address(usdc)),
            IMintableERC20(address(cny)),
            IMintableERC20(address(sgd))
        );

        // Get alice some mUSDC through the funded pool first.
        _boot(alice);
        _enroll(alice);
        _approveMax(alice, IERC20View(address(cny)));
        vm.prank(alice);
        pool.swap(r1, BOOT_CNY);

        vm.startPrank(alice);
        dryPool.enroll(3); // policies are per-pool; the dry pool needs its own
        usdc.approve(address(dryPool), type(uint256).max);
        vm.expectRevert("DemoFX: pool short on MON");
        dryPool.swap(r2, HOP1_USDC);
        vm.stopPrank();
    }

    function test_AgentOwnerIsAttestationHolderSoulbond() public {
        uint8 r1 = pool.R_CNY_USDC();
        _boot(alice);
        _enroll(alice);
        _approveMax(alice, IERC20View(address(cny)));
        vm.prank(alice);
        pool.swap(r1, BOOT_CNY);

        address agentOwner = registry.ownerOf(1);
        assertEq(reputation.ownerOf(1), agentOwner);
        vm.prank(agentOwner);
        vm.expectRevert("Reputation: soulbound");
        reputation.transferFrom(agentOwner, alice, 1);
    }
}