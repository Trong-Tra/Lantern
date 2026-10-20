# Lantern — Test Cases

Index of every test file in the source, what each covers, and the test counts.

## Summary

| Area | Framework | Files | Tests | Suites | Command |
|------|-----------|-------|-------|--------|---------|
| Contracts (Foundry) | Forge | 9 | 90 | 9 | `forge test` |
| API (Node + tsx) | node:test | 3 | 86 | 18 | `pnpm --filter @lantern/api test` |
| Web (Node) | node:test | 1+ | 36 | 1 | `pnpm --filter @lantern/web test` |
| Snap (vitest) | vitest | 1 | 9 | 1 | `pnpm test` in `packages/snap` |
| **Total** | | **14+** | **221** | **29** | |

---

## 1. Contracts — `contracts/`

**Framework:** Foundry (`forge test`)  
**Command:** `forge test` (from `contracts/`)  
**Count:** 90 tests, 9 suites, 0 failed

### Test files

| File | What it covers |
|------|----------------|
| `contracts/test/AgentPassport.t.sol` | ERC-721 passport minting, ownership, URI |
| `contracts/test/AgentRegistry.t.sol` | ERC-8004 agent registration, agentId assignment |
| `contracts/test/AgentVault.t.sol` | deposit/withdraw, per-user balances, attestation minting |
| `contracts/test/DemoFX.t.sol` | **Agent-wallet corridor** — enroll policy, boot leg, 3-hop CNY→USDC→MON→SGD, policy-gate revert (4th swap), re-enroll after exhaustion, constructor checks |
| `contracts/test/ERC721.t.sol` | Base ERC-721 utility behavior |
| `contracts/test/LumenGasComparison.t.sol` | Lazy (153,092 gas) vs eager full-recompute (2,720,429 gas) scoring gas proof |
| `contracts/test/Reputation.t.sol` | ERC-5192 soulbound attestations, executor authorization, transfer reverts |
| `contracts/test/SeedAgents.t.sol` | 15 seed agent registration from JSON |
| `contracts/test/SeedAttestations.t.sol` | 120+ seeded attestation minting |

### Run
```bash
cd contracts
forge test
forge test --match-contract DemoFXTest -vv      # corridor only
forge test --match-contract LumenGasComparison -vv  # gas proof only
```

---

## 2. API — `apps/api/`

**Framework:** Node `node:test` with tsx  
**Command:** `pnpm --filter @lantern/api test` (from root) or `pnpm test` (from `apps/api/`)  
**Count:** 86 tests, 18 suites, 0 failed

### Test files

| File | What it covers |
|------|----------------|
| `apps/api/src/app.test.ts` | Express app — GET agents, GET profile, GET attestations, GET risk, POST chat, Snap lookup, error envelopes, model fallback chain |
| `apps/api/src/repositories/envioAgentRepository.test.ts` | Envio-backed repository (faked GraphQL, zero network) — list agents, get agent, attestations pagination, risk derivation, score derivation (v0/v1), findByAddress, DATA_SOURCE switch |
| `apps/api/src/repositories/scoring.test.ts` | **Lumen Score v1** — accuracy (recency-weighted), trust mass/volume (caps at n=50), decay/dormancy (30-day half-life), double penalty on failure, tier boundaries (T0–T3), volume asymptote, Sybil resistance, v0↔v1 consistency, determinism, clock-skew guard, **live metrics report** (console-prints tier ladder, asymptote, decay curve, double penalty) |

### Run
```bash
cd apps/api
pnpm test                      # all 86
node --import tsx --test "src/repositories/scoring.test.ts"  # scoring only (26 tests, prints live metrics)
```

---

## 3. Web — `apps/web/`

**Framework:** Node `node:test` (`.mjs`)  
**Command:** `pnpm --filter @lantern/web test` (from root) or `pnpm test` (from `apps/web/`)  
**Count:** 36 tests, 0 failed

### Test files

| File | What it covers |
|------|----------------|
| `apps/web/tests/*.test.mjs` | Landing scenes/timeline (12 chapters), lantern scroll physics, intent matching, agent fetching, pagination, query helpers, risk formatting, `validateMonAmount` |

### Run
```bash
cd apps/web
pnpm test
```

---

## 4. Snap — `packages/snap/`

**Framework:** vitest  
**Command:** `pnpm test` (from `packages/snap/`)  
**Count:** 9 tests, 0 failed

### Test files

| File | What it covers |
|------|----------------|
| `packages/snap/**/*.test.ts` (vitest) | Transaction Insights — `onTransaction` → lookup endpoint → identity/risk panel, honest fallbacks (unknown agent / wrong chain / API down) |

### Run
```bash
cd packages/snap
pnpm test
```

---

## How to run everything

From the repo root:

```bash
# Install once
pnpm install

# Contracts
cd contracts && forge test

# API
cd apps/api && pnpm test

# Web
cd apps/web && pnpm test

# Snap
cd packages/snap && pnpm test

# Typecheck across all workspaces
pnpm typecheck   # tsc --noEmit
```

## CI expectation

All suites must be green before merging:
- `forge test` → 90/90
- `pnpm --filter @lantern/api test` → 86/86
- `pnpm --filter @lantern/web test` → 36/36
- `pnpm test` in `packages/snap` → 9/9
- `pnpm typecheck` → clean
