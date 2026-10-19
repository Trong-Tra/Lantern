# Lantern — Security Design & Self-Assessment

## 1. Overview

Lantern is a passkey-native agent identity + reputation platform on Monad (chain 10143). Autonomous agents manage user funds; every action is permanently attested to a soulbound passport, computed into a Lumen Score, and enforced through score-gated permissions (Reputation-Gated Autonomy). The user can withdraw their money at any time.

This document captures the security design and a self-assessment of known risks. It is a living artifact — update it in the same commit as any behavior change.

## 2. Trust model

| Actor | Trust assumption |
|-------|------------------|
| User (MetaMask / passkey) | Holds the sign wallet; funds and withdraws from the agent wallet at will; never signs per-trade |
| Agent wallet | Separate permanent key; auto-signs swaps; holds user funds; never recreated |
| Agent operator | Mints attestations as counterparty (never self-declared); attestations are soulbound |
| Pool / Vault contracts | Non-upgradeable; immutable once deployed; owner = deployer |
| Indexer / API | Read-only mirror of on-chain state; not a source of truth for gating |

## 3. Permission-tier implementation (RGA)

Reputation-Gated Autonomy (RGA) is a five-stage pipeline. Every agent action flows through it, and the permission gateway is bound to on-chain reputation tiers.

```
① IDENTITY → ② POLICY GATE (tier check) → ③ EXECUTION → ④ ATTESTATION (mint) → ⑤ SCORE UPDATE
```

### 3.1 Pipeline stages

| Stage | Enforcement | On failure |
|-------|-------------|------------|
| ① Identity | Action carries the agent's ERC-8004 passport; `registry.ownerOf(agentId)` must resolve | Revert: unknown agent |
| ② Policy gate | Contract checks live tier against the action's risk class **before** execution; effective limits = min(tier cap, user mandate cap) | Revert *before* anything exists on-chain — prompt-proof by construction |
| ③ Execution | Bounded by dual caps (tier cap + user mandate cap) | Revert if over cap |
| ④ Attestation | Outcome minted as ERC-5192 soulbound attestation (success ✓ / failure ✗, amount, reason). Failure is attested with same permanence as success — punished twice: accuracy falls AND trust mass (V) drops | Revert if executor not authorized |
| ⑤ Score update | Lumen Score recomputed (off-chain, lazy) feeding tier for the **next** action | N/A |

### 3.2 Tier sketch (parameters illustrative, calibrated in pilot)

| Tier | Lumen score | Autonomy granted |
|------|-------------|------------------|
| T0 — Registered | ≥ 0 | Identity only; sandbox; no user funds |
| T1 — Proven | ≥ 40 | Small delegated limits; basic execution |
| T2 — Trusted | ≥ 70 | Elevated limits; multi-product; CNY corridor access |
| T3 — Systemic | ≥ 90 | Institutional limits; treasury-scale; best-tier economics |

### 3.3 Lumen Score v1 (API-side, lazy recompute)

```
score = 100 × A × V
A = Σᵢ γ^(aᵢ) · xᵢ / Σᵢ γ^(aᵢ)     γ = 2^(−1/30)  (30-day half-life)
V = min(n, 50) / 50                   trust mass / volume gate
xᵢ ∈ {0,1}                            attestation outcome (SUCCESS / FAIL)
```

- `A` = recency-weighted accuracy. An execution's weight halves every 30 days.
- `V` = hard volume gate: a perfect 2-run record scores 4, not 100. A Sybil identity can't borrow credibility it hasn't earned.
- Computed off-chain on read (lazy). Zero gas until a new attestation lands. On-chain gating recomputes the same function at action time.
- Gas proof (measured): lazy 153,092 gas/action vs eager full-recompute 2,720,429 (17.8×). ≈94% saved at demo history.

## 4. Contract security properties

| Contract | Property | Implementation |
|----------|----------|----------------|
| AgentRegistry | Canonical identity per agent | `registerAgent(uri) → agentId`; owner-of resolves; non-upgradeable |
| AgentPassport | Transferable visual passport | ERC-721, 1:1 with agent; minted by registry owner |
| Reputation | Soulbound attestation history | ERC-5192; owner + authorized executors mint; `transferFrom` reverts ("soulbound"); executor revocation stops new mints |
| AgentVault | Deposit / withdraw | `deposit()` payable; `withdraw(amount)`; per-user `balanceOf`; reverts on insufficient balance; plain sends revert ("use deposit()") |
| DemoFXPool | Agent-wallet corridor | Per-wallet one-shot swap policy; `enroll(maxSwaps)` immutable until consumed; re-enroll allowed after full consumption (same wallet keeps funds); 4th counted swap reverts "policy exhausted"; native-MON legs paid as `value`; token legs via `transferFrom` (approve first); `receive()` reverts |

## 5. Known risk list

| ID | Risk | Severity | Status | Mitigation |
|----|------|----------|--------|------------|
| R-01 | Agent wallet key stored in browser `localStorage` (demo only) | High | Known | Testnet-only notice; user advised to back up key; production moves to Dynamic passkey (P256/WebAuthn, server-side, no seed) |
| R-02 | Agent auto-signs swaps — compromised agent key = drained agent wallet | High | Known | Agent wallet holds only user-deposited funds; user can withdraw anytime; gas reserve (0.02 MON) kept so agent can't strand funds |
| R-03 | Policy gate is one-shot per wallet until consumed; cannot be raised mid-flight | Medium | Accepted (design) | Intentional: "a generous maxSwaps cannot be renegotiated mid-flight"; re-enroll allowed after full consumption |
| R-04 | Score computed off-chain (API) — not on-chain | Medium | Known | On-chain gate recomputes at action time; v2 in-contract recalibration planned (docs/09 §7) |
| R-05 | Reputation executor authorization — if revoked, deposit/withdraw revert | Medium | Known | Pool authorized as executor; owner controls setExecutor; monitored |
| R-06 | Soulbound attestations cannot be transferred or reset | Medium | Accepted (design) | Intentional: history cannot be sold, washed, or reset; sybil re-registration restarts at T0 |
| R-07 | Reentrancy on `withdraw()` (call before state update?) | Low | Mitigated | `balanceOf` decremented before external call; `totalDeposits` decremented; CEI pattern followed |
| R-08 | Frontend RPC URL hardcoded default (`testnet-rpc.monad.xyz`) | Low | Known | `NEXT_PUBLIC_MONAD_RPC_URL` required in `.env`; panels render disabled notice if missing |
| R-09 | No on-chain RGA gate yet (score write-back = missing 50%) | High | Planned | docs/09 §7 — v2 recalibration in-contract; score-derived caps specified, not coded |
| R-10 | Testnet funds only — no mainnet deployment | Info | Accepted | Monad testnet (chain 10143) only; mainnet switch TBD |

## 6. Self-assessment summary

| Area | Grade | Notes |
|------|-------|-------|
| Access control / tier gating | B | Policy gate enforced on-chain before execution; RGA on-chain gate (score write-back) not yet implemented |
| Fund custody | B | User withdraws anytime; agent wallet permanent; gas reserve prevents stranding |
| Attestation integrity | A | ERC-5192 soulbound; counterparty-minted; executor authorization; transfer reverts |
| Upgradeability | A | Contracts non-upgradeable; immutable once deployed |
| Key management | C | Demo key in localStorage; production passkey roadmap (Dynamic) |
| Testing | A | Forge 90/90; API 85/85; web 36/36; snap 9/9 |

**Overall: B+** — Core custody and gating mechanics are sound for testnet demo; the two gaps to production are (1) on-chain RGA score write-back and (2) passkey-native key management replacing localStorage.

## 7. Remediation roadmap

1. On-chain RGA gate: write Lumen Score back to contract; score-derived caps (§4.3 of docs/09).
2. Dynamic passkey wallet: replace localStorage agent key with P256/WebAuthn server-side key (no seed).
3. Envio cloud deploy + public Snap ID.
4. Mainnet switch (after testnet validation).
5. External security audit before mainnet.
