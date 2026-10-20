# Lantern — Security Self-Assessment Report

> FinTechathon (PBCSF/WeBank) Topic F — Agent Wallet. This report follows the organizer's required structure: **(1) Permission-Tier Implementation** and **(2) Known Security Risks**. It is a living artifact — update it in the same commit as any behavior change.
>
> Scope: Lantern on Monad testnet (chain 10143) — 4 identity/vault contracts + `DemoFXPool` agent-wallet corridor, API, web explorer, MetaMask Snap, Envio indexer.

---

## 1. Permission-Tier Implementation

Reputation-Gated Autonomy (RGA) is a five-stage pipeline. Every agent action flows through it, and the permission gateway is bound to reputation tiers computed from the agent's soulbound attestation history.

```
① IDENTITY → ② POLICY GATE (tier check) → ③ EXECUTION → ④ ATTESTATION (mint) → ⑤ SCORE UPDATE
```

### 1.1 Who has permission?

The roles and components that hold permissions in the Agent Wallet:

| Role / component | Identity | Permission granted |
|------------------|----------|--------------------|
| **User** (MetaMask, or Dynamic passkey in production) | Human, holds own wallet | Owns the funds. Funds the agent wallet, withdraws **at any time**. Never signs per-trade. |
| **Agent wallet** | Separate permanent key (`localStorage`, never regenerated) | Auto-signs **swaps only**, within the enrolled policy. Holds user-deposited funds. Cannot move funds outside the corridor. |
| **Agent operator / counterparty** | `registry.ownerOf(agentId)` | Mints attestations as counterparty (never self-declared). Cannot mint for own agent to inflate score. |
| **Contract owner (deployer)** | `0x7EA634e3…2F1F2` | Authorizes Reputation executors (`setExecutor`). Sole privileged role. |
| **Reputation executor** (DemoFXPool) | Authorized by owner | Mints outcome attestations on completed swaps. Revocation stops new mints immediately. |
| **Indexer / API** | Envio HyperIndex mirror | Read-only. **Not** a source of truth for gating — all enforcement is on-chain. |

### 1.2 What can they do?

Each component's permitted actions and their hard limits:

| Component | Allowed actions | Hard limits |
|-----------|-----------------|-------------|
| User | `deposit()` / fund agent wallet; `withdraw(amount)` from AgentVault; request agent wallet to send MON back | AgentVault: per-user `balanceOf`, reverts on insufficient balance. Agent wallet: keeps a gas reserve (0.02 MON) so withdrawals are never stranded. |
| Agent wallet | Execute corridor swaps via `DemoFXPool` | **Dual caps**: effective limit = min(tier cap, user mandate cap). `enroll(maxSwaps)` is immutable until fully consumed — a generous mandate cannot be renegotiated mid-flight. 4th counted swap reverts `policy exhausted`. |
| Pool / Vault contracts | Swap execution, attestation minting | Non-upgradeable, immutable once deployed. `receive()` reverts — plain sends rejected ("use deposit()"). |
| Counterparty | Mint outcome attestation | Only via authorized executor; attestation is ERC-5192 soulbound (non-transferable). |

### 1.3 How are permissions enforced?

The mechanisms that prevent any component — including the AI agent — from exceeding its authority:

| Stage | Enforcement | On failure |
|-------|-------------|------------|
| ① Identity | Action carries the agent's ERC-8004 passport; `registry.ownerOf(agentId)` must resolve | Revert: unknown agent |
| ② Policy gate | Contract checks live tier against the action's risk class **before** execution; effective limits = min(tier cap, user mandate cap) | Revert **before** anything exists on-chain — prompt-proof by construction: an AI agent cannot be prompt-injected into an over-limit action, because the revert happens in the contract, not in the agent's discretion |
| ③ Execution | Bounded by dual caps (tier cap + user mandate cap) | Revert if over cap |
| ④ Attestation | Outcome minted as ERC-5192 soulbound attestation (success ✓ / failure ✗, amount, reason). Failure is attested with the same permanence as success — punished twice: accuracy falls **and** trust mass (V) drops | Revert if executor not authorized |
| ⑤ Score update | Lumen Score recomputed (off-chain, lazy), feeding the tier for the **next** action | N/A |

**Permission tiers** (parameters illustrative, calibrated in pilot):

| Tier | Lumen score | Autonomy granted |
|------|-------------|------------------|
| T0 — Registered | ≥ 0 | Identity only; sandbox; no user funds |
| T1 — Proven | ≥ 40 | Small delegated limits; basic execution |
| T2 — Trusted | ≥ 70 | Elevated limits; multi-product; CNY corridor access |
| T3 — Systemic | ≥ 90 | Institutional limits; treasury-scale; best-tier economics |

**Lumen Score v1** (API-side, lazy recompute — the input to tier assignment):

```
score = 100 × A × V
A = Σᵢ γ^(aᵢ) · xᵢ / Σᵢ γ^(aᵢ)     γ = 2^(−1/30)  (30-day half-life)
V = min(n, 50) / 50                   trust mass / volume gate
xᵢ ∈ {0,1}                            attestation outcome (SUCCESS / FAIL)
```

- `A` = recency-weighted accuracy; an execution's weight halves every 30 days (dormancy decays trust).
- `V` = hard volume gate: a perfect 2-run record scores 4, not 100. A Sybil identity cannot borrow credibility it hasn't earned.
- **Score-gating is enforced on-chain at action time** — the off-chain API score is display only, never the enforcement point.

### 1.4 How do you prove it works?

| Claim | Evidence (source / test / log) |
|-------|-------------------------------|
| Policy gate reverts over-limit actions | `contracts/test/DemoFX.t.sol` — enroll policy, 3-hop CNY→USDC→MON→SGD, **policy-gate revert on the 4th swap**, re-enroll after exhaustion. `forge test` 90/90 |
| Execution is bounded by enrolled mandate | `contracts/src/DemoFXPool.sol` — `enroll(maxSwaps)` immutable until consumed; counted-swap tracking |
| Only authorized executors mint attestations | `contracts/test/Reputation.t.sol` — executor authorization + revocation tests; `transferFrom` reverts ("soulbound") |
| Soulbound history cannot be sold/washed/reset | `contracts/test/Reputation.t.sol`, `contracts/test/AgentVault.t.sol` |
| Withdrawal cannot be bricked / reentrancy-safe | `contracts/test/AgentVault.t.sol` — CEI pattern: `balanceOf` decremented before external call |
| Score formula: decay, volume gate, double penalty, determinism | `apps/api/src/repositories/scoring.test.ts` — 25 tests (accuracy, trust mass, 30-day half-life, T0–T3 tier boundaries, Sybil resistance, clock-skew guard) |
| Full regression | Contracts 90/90 · API 85/85 · Web 36/36 · Snap 9/9 (`TEST_CASE.md`) |
| Live deployment | 5 contracts verified on MonadScan (chain 10143), addresses in root `README.md`; `DemoFXPool` v2 redeployed 2026-10-18 |

---

## 2. Known Security Risks

### 2.1 What are the security risks?

Risks spanning AI agent behavior, private keys, blockchain transactions, smart contracts, and external tooling:

| **Risk** | **Severity** | **Mitigation** | **Status** | **Residual Risk** |
| --- | --- | --- | --- | --- |
| Prompt injection → unauthorized agent action | Critical | **On-chain policy gate**: over-limit actions revert in-contract before execution, independent of agent discretion. Failure outcomes are permanently attested and score-punishing | Tested (DemoFX.t.sol policy-gate revert) | Low |
| Agent wallet key stored in browser `localStorage` (demo build) | Critical | Testnet-only notice; user advised to back up key; production moves to Dynamic passkey (P256/WebAuthn, server-side, no seed) | Known (demo) — production Planned | **Critical** until passkey ships |
| Compromised agent key = drained agent wallet | High | Agent wallet holds only user-deposited funds (never more than the user chose to delegate); user can withdraw anytime; gas reserve (0.02 MON) kept so agent can't strand funds | Implemented | Medium |
| No on-chain RGA score write-back yet | High | Off-chain score is display-only; on-chain gate recomputes at action time. v2 in-contract recalibration planned (docs/09 §7) | Planned | **High** |
| Reputation executor compromise / revocation bricks flows | Medium | Executor set is owner-controlled; pool currently authorized; revocation stops new mints immediately (tested) | Implemented + monitored | Low |
| Reentrancy on `withdraw()` | Medium | CEI: `balanceOf` and `totalDeposits` decremented before external call | Mitigated (tested) | Low |
| One-shot policy cannot be raised mid-flight | Low | Intentional design: "a generous maxSwaps cannot be renegotiated mid-flight"; re-enroll allowed after full consumption — same wallet keeps its funds | Accepted (design) | Low |
| Soulbound attestations cannot be transferred or reset | Low | Intentional: history cannot be sold, washed, or reset; Sybil re-registration restarts at T0 | Accepted (design) | Low |
| Frontend RPC misconfiguration | Low | `NEXT_PUBLIC_MONAD_RPC_URL` required; panels render a disabled notice if missing — no silent fallback to a wrong chain | Implemented | Low |
| Testnet funds only — no mainnet exposure | Info | Monad testnet (chain 10143) only; mainnet switch TBD with external audit first | Accepted | Info |

### 2.2 How severe are these risks?

Severity = likelihood × impact, per NIST SP 800-30 framing:

- **Critical**: prompt injection (high likelihood for any LLM-driven agent, high impact on funds — contained by the on-chain gate) and demo localStorage key storage (high impact if browser is compromised — accepted for testnet demo only, must not ship to production).
- **High**: compromised agent key (bounded by delegated funds + anytime withdrawal, but nonzero), missing on-chain score write-back (the reputation system is not yet self-enforcing end-to-end).
- **Medium**: executor compromise, reentrancy — both mitigated and tested.
- **Low / Info**: design-intentional constraints and testnet scope.

### 2.3 How are these risks mitigated?

See the Mitigation column in §2.1. The architectural invariant: **the AI agent proposes, the contract disposes**. No amount of prompt manipulation can move funds outside the enrolled corridor policy, because every leg is validated on-chain before execution, and every outcome — success or failure — is permanently recorded on a soulbound passport that directly lowers the agent's future autonomy.

### 2.4 What risks still remain?

1. **localStorage key storage (Critical, residual)** — the single largest gap. Until Dynamic passkey (P256/WebAuthn, server-side, no seed) ships, the demo agent key is only as safe as the browser. Production blocker.
2. **No on-chain RGA score write-back (High, residual)** — the tier gate exists, but the score that feeds it is not yet written back on-chain (v2 in-contract recalibration, docs/09 §7). Until then, tier parameters are owner-set, not score-derived.
3. **Single-owner executor management** — the owner key is the only privileged role; no multisig yet. Roadmap item before mainnet.
4. **No external security audit** — all evidence is self-generated (tests + on-chain verification). An external audit is planned before any mainnet deployment.

**Remediation roadmap** (priority order): ① Dynamic passkey key management → ② on-chain RGA score write-back → ③ executor multisig → ④ Envio cloud deploy + public Snap ID → ⑤ external audit → ⑥ mainnet switch.

### 2.5 How do you prove the mitigations work?

| Mitigation | Proof |
|------------|-------|
| On-chain policy gate (prompt-injection containment) | `contracts/test/DemoFX.t.sol`: 4th swap reverts `policy exhausted` — the gate fires in-contract, not in agent code. Live on `DemoFXPool v2 0xC8929Caa…77cd` (MonadScan-verified, redeployed 2026-10-18) |
| Corridor execution bounded by mandate | `DemoFX.t.sol`: enroll policy, boot leg, 3-hop CNY→USDC→MON→SGD, re-enroll after exhaustion |
| Executor authorization + soulbound enforcement | `contracts/test/Reputation.t.sol`: authorized mint succeeds, unauthorized reverts, `transferFrom` reverts ("soulbound"), revocation stops mints |
| Vault custody safety (insufficient balance, plain-send revert, CEI) | `contracts/test/AgentVault.t.sol` |
| Score integrity (decay, volume gate, double penalty, determinism) | `apps/api/src/repositories/scoring.test.ts` — 25 tests |
| Gas-cost viability of lazy scoring | `contracts/test/LumenGasComparison.t.sol`: lazy 153,092 gas vs eager 2,720,429 (17.8×) — permission enforcement is cheap enough to run on-chain |
| Full regression | Contracts 90/90 · API 85/85 · Web 36/36 · Snap 9/9 (`TEST_CASE.md`); all suites green |

### References

- OWASP Application Security Verification Standard (ASVS)
- OWASP Threat Modeling
- NIST SP 800-30 — Guide for Conducting Risk Assessments
- ERC-8004 (Trustless Agents), ERC-5192 (Soulbound), ERC-721
