// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {Reputation} from "../src/Reputation.sol";

/// @title EagerLumenScorer — THE ROAD NOT TAKEN
/// @notice Hypothetical counterfactual, test-only: never deployed anywhere.
///         Lantern's LIVE scoring (Lumen, docs/09 §4.2 / docs/03) is computed
///         LAZILY off-chain as a pure function of attestation history on read —
///         on-chain cost per action is the attestation mint ALONE, and nothing
///         else ("zero gas until a new attestation lands").
///         This contract shows what "update reputation using the lumen score
///         formula" on-chain, per action, would have cost instead — the two
///         standard ways to do it, both gas-metered by LumenGasComparisonTest:
///         - scoreIncremental(B): store only the new action's delta (the careful
///           implementation) — still +gas +storage write on EVERY action;
///         - scoreFullRecompute(C): re-read the ENTIRE attestation history and
///           rewrite the score after every action — O(history) per action, the
///           "devastating" naive formula. The score math itself is a stand-in
///           (shape is irrelevant): reading history data is where the gas goes.
contract EagerLumenScorer {
    event ScoreUpdated(uint256 indexed agentId, uint256 score);

    Reputation public immutable reputation;
    mapping(uint256 agentId => uint256 score) public scoreOf;

    constructor(Reputation reputation_) {
        reputation = reputation_;
    }

    /// (B) Incremental per-action write: delta of the new action only.
    function scoreIncremental(uint256 agentId, bool success, uint256 amount) external returns (uint256 score) {
        uint256 current = scoreOf[agentId];
        if (current == 0) current = 10_000; // neutral prior
        score = success ? current + 6 : current - 8;
        score += amount / 1e18;
        scoreOf[agentId] = score;
        emit ScoreUpdated(agentId, score);
    }

    /// (C) Full recompute over the whole history after every single action.
    function scoreFullRecompute(uint256 agentId, uint256 historyLength) external returns (uint256 score) {
        score = 10_000; // neutral prior (docs/09 §4.2: dormant drifts back to prior)
        for (uint256 tokenId = 1; tokenId <= historyLength; tokenId++) {
            Reputation.Attestation memory a = reputation.getAttestation(tokenId);
            if (a.agentId != agentId) continue;
            score += a.result == Reputation.Result.SUCCESS ? 6 : 8;
            score += a.amount / 1e18;
            // touch both string payloads — a real formula needs protocol/uri context
            score += bytes(a.protocol).length;
            score += bytes(a.uri).length;
        }
        scoreOf[agentId] = score;
        emit ScoreUpdated(agentId, score);
    }
}

/// @title LumenGasComparisonTest — lazy vs eager scoring, gas edition
/// @notice Documentation-grade, rerunnable evidence for the docs/09 claim that
///         lazy recompute "reduces gas (token) consumption significantly".
///         Measurements use gasleft() deltas around SINGLE actions only, after
///         vm.cool() so every storage read starts cold — i.e. exactly what one
///         real user transaction pays (foundry's whole-test gas column, by
///         contrast, shares warmth across calls and under-measures this).
///
///         Rerun:  cd contracts && forge test --match-contract LumenGasComparison -vv
///         Spot price used for MON figures: 102 gwei (Monad testnet at
///         measurement 2026-10-18; the GAS UNITS are the durable numbers).
contract LumenGasComparisonTest is Test {
    /// Matches the demo's seeded history size (docs/02). The O(history) trap
    /// in path C grows linearly — measured again at 2× below.
    uint256 internal constant HISTORY = 120;
    uint256 internal constant GAS_PRICE_GWEI = 102;

    AgentRegistry internal registry;
    Reputation internal reputation;
    EagerLumenScorer internal scorer;

    function setUp() public {
        registry = new AgentRegistry();
        reputation = new Reputation(registry);
        registry.registerAgent("demo://lantern/yield-keeper"); // agent 1, owner = this test
        scorer = new EagerLumenScorer(reputation);
    }

    function _mintOne(bool success) internal returns (uint256) {
        return reputation.mintAttestation(
            1,
            Reputation.ActionType.SWAP,
            success ? Reputation.Result.SUCCESS : Reputation.Result.FAIL,
            0.1 ether,
            "demo://protocols/demo-fx",
            "demo://demofx/corridor-swap"
        );
    }

    /// ~86% success, mirroring the seeded demo history (docs/02).
    function _seedHistory(uint256 count) internal {
        for (uint256 i = 1; i <= count; i++) {
            _mintOne(i % 7 != 0);
        }
    }

    /// Reset storage warmth everywhere a real single tx would start cold.
    function _coolAll() internal {
        vm.cool(address(registry));
        vm.cool(address(reputation));
        vm.cool(address(scorer));
    }

    function _microMon(uint256 gasUsed) internal pure returns (uint256) {
        // cost in 1e-6 MON at GAS_PRICE_GWEI: wei = gas*gwei*1e9 → /1e12
        return gasUsed * GAS_PRICE_GWEI / 1e3;
    }

    // ---------------------------------------------------------------- paths

    function test_Gas_A_Lazy_OneAction_OffChainScore() public {
        _seedHistory(HISTORY);
        _coolAll();
        uint256 before = gasleft();
        _mintOne(true); // the ONLY on-chain cost of an action in the live system
        uint256 gasUsed = before - gasleft();
        console.log("[A lazy] one action (attest only), gas:", gasUsed);
        console.log("[A lazy] cost at spot, micro-MON:", _microMon(gasUsed));
        assertLt(gasUsed, 500_000, "A: a single mint must stay cheap");
    }

    function test_Gas_B_Eager_IncrementalWrite() public {
        _seedHistory(HISTORY);
        _coolAll();
        uint256 before = gasleft();
        _mintOne(true);
        scorer.scoreIncremental(1, true, 0.1 ether);
        uint256 gasUsed = before - gasleft();
        console.log("[B eager incremental] mint + score write, gas:", gasUsed);
        console.log("[B eager incremental] cost at spot, micro-MON:", _microMon(gasUsed));
        assertLt(gasUsed, 800_000, "B: incremental write should stay under 0.8M");
    }

    function test_Gas_C_Eager_FullRecompute_AtHistory120() public {
        _seedHistory(HISTORY);
        _coolAll();
        uint256 before = gasleft();
        _mintOne(true);
        scorer.scoreFullRecompute(1, HISTORY + 1);
        uint256 gasUsed = before - gasleft();
        console.log("[C eager full-recompute] mint + rewrite score over full history, gas:", gasUsed);
        console.log("[C eager full-recompute] cost at spot, micro-MON:", _microMon(gasUsed));
        assertGt(gasUsed, 1_000_000, "C: naive formula must show its cost");
    }

    // ------------------------------------------------------- the comparison

    function test_Comparison_LazyVsEagerReport() public {
        _seedHistory(HISTORY);

        // A — live system: one attestation mint, score stays off-chain.
        _coolAll();
        uint256 t0 = gasleft();
        _mintOne(true);
        uint256 lazyGas = t0 - gasleft();

        // B — incremental on-chain write per action.
        _coolAll();
        t0 = gasleft();
        _mintOne(true);
        scorer.scoreIncremental(1, true, 0.1 ether);
        uint256 incrementalGas = t0 - gasleft();

        // C — full-formula recompute per action at history = 120.
        _coolAll();
        t0 = gasleft();
        _mintOne(true);
        scorer.scoreFullRecompute(1, HISTORY + 1);
        uint256 full120Gas = t0 - gasleft();

        // C at double history — the O(history) trap worsens for free.
        _seedHistory(HISTORY);
        _coolAll();
        t0 = gasleft();
        scorer.scoreFullRecompute(1, 2 * HISTORY);
        uint256 full240Gas = t0 - gasleft();

        // Per-100-actions projection at a stable 120-history.
        uint256 lazy100 = lazyGas * 100;
        uint256 incremental100 = incrementalGas * 100;
        uint256 full100 = full120Gas * 100;

        console.log("");
        console.log("=== Lumen scoring gas proof: lazy (LIVE) vs eager on-chain (not taken) ===");
        console.log("history size (attestations):", HISTORY);
        console.log("spot gas price at measurement, gwei:", GAS_PRICE_GWEI);
        console.log("--- per single action (cold storage, gas units) ---");
        console.log("A lazy: attest only, score off-chain ............ gas:", lazyGas);
        console.log("B eager: attest + incremental score write ....... gas:", incrementalGas);
        console.log("C eager: attest + full-formula recompute ........ gas:", full120Gas);
        console.log("C eager @ 2x history, recompute only ........... gas:", full240Gas);
        console.log("--- ratios x100 (100 = parity) ---");
        console.log("B/A x10:", (incrementalGas * 100) / lazyGas);
        console.log("C/A x10:", (full120Gas * 100) / lazyGas);
        console.log("--- 100 actions at 120-history, cost micro-MON @ spot ---");
        console.log("A lazy 100 actions ...........................:", _microMon(lazy100));
        console.log("B eager 100 actions ..........................:", _microMon(incremental100));
        console.log("C eager 100 actions ..........................:", _microMon(full100));
        console.log("C/A saved by lazy, 100 actions, micro-MON .....:", _microMon(full100 - lazy100));

        // The doc claim, guarded: lazy < incremental < full-recompute, C is
        // multiples of A even at the demo's modest history size.
        assertTrue(lazyGas < incrementalGas, "A must beat B");
        assertTrue(incrementalGas < full120Gas, "B must beat C");
        assertGt(full120Gas, lazyGas * 5, "C costs a multiple of A");
        assertGt(full240Gas, full120Gas, "C grows with history (O(n) per action)");
    }
}