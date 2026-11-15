# 01 — Architecture

> **TARGET design.** Current state lives in `MEMORY.md` §Current state — MEMORY wins on any conflict.

## Concept (pivot 3, 2026-11-14)

Lantern is **Lantern Graph + Market** — Matcha-style aggregation, but the solver set is an open network of on-chain-identified agents buying the maintained graph and streaming quotes to users, instead of a closed/market-maker set. The user picks the quote; the protocol never crowns an algorithm.

The insight: every aggregator builds a graph of pools (assets = nodes, pools = edges) and searches it (BFS/DFS/Dijkstra variants). No single search wins always — the best answer depends on swap size, graph topology, and pool state at that moment, and on how the total amount is **sliced across routes** (a 3%-slice solver answers fast; a 1.2%-slice solver prices better but slower). So we don't crown one algorithm: we build the graph and let solvers **compete** on it. Users pick the best solution; winners earn the fee; outcomes are attested on-chain, so standing is earned from real wins.

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│ WEB APP (browser) — FROZEN pre-pivot, rebuild pending       │
│ Cinematic landing (stays) · swap UI (TBD — not built)       │
└─────────────────────────────┬───────────────────────────────┘
                              │ GraphQL (gqlgen — not built yet)
┌─────────────────────────────▼───────────────────────────────┐
│ BACKEND (services/market, Go — the only backend)            │
│ TODAY: quote-protocol WS + reference solver + settlement    │
│ TBD: gqlgen API (identity reads + market queries), x402     │
│ REMOVED: apps/api (Express) — deleted 2026-11-15            │
└─────────────────────────────┬───────────────────────────────┘
                              │ GraphQL (read)
┌─────────────────────────────▼───────────────────────────────┐
│ INDEXING (Envio HyperIndex, Avalanche Fuji 43113)           │
│ Indexes: AgentRegistered/Updated, AttestationMinted,        │
│ DemoPool.Sync, LanternMarket.TradeSettled                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ events
┌─────────────────────────────▼───────────────────────────────┐
│ ON-CHAIN (Avalanche Fuji, Foundry)                          │
│ AgentRegistry (ERC-8004) + Reputation (ERC-5192)            │
│ + MockToken / DemoPool / LanternMarket — DEPLOYED 2026-11-15│
└─────────────────────────────▲───────────────────────────────┘
                              │ off-chain solvers
┌─────────────────────────────┴───────────────────────────────┐
│ SOLVERS (off-chain agents; reference solver built)          │
│ Read the pool graph, compute routes + split allocations,    │
│ stream signed quotes. ERC-8004 identity binds payout+record.│
└─────────────────────────────────────────────────────────────┘
```

## Repo mapping (today)

| Layer | Repo location | Status |
| --- | --- | --- |
| Identity + market contracts | `contracts/src/{AgentRegistry,Reputation,MockToken,DemoPool,LanternMarket}.sol` + `src/utils/` (in-house ERC721/Ownable), tests in `test/`, deploy/seed in `script/` | Deployed on Fuji 43113 (2026-11-15); Monad deployment legacy; `forge test` 93/93 |
| Indexing | `indexer/` — Envio HyperIndex v3: `config.yaml` + `schema.graphql` + `src/handlers/` + `src/effects.ts` + vitest | Configured with live Fuji addresses; local (Docker; GraphQL :8080); cloud deploy pending `ENVIO_API_TOKEN` |
| Backend | `services/market/` — Go: quote-protocol WS, reference solver, chain bindings, ingest + graph store | Phases 1–2 done (settlement e2e passing on Fuji); gqlgen web API TBD (Phase 3/4) |
| Shared libs | `packages/config` (endpoint paths — **stale: old `/api/*` paths, do not use until the Go API lands**), `packages/types` (agent/attestation types), `packages/utils` (envelope, formatting) | Done, extend as needed |
| Web | `apps/web/` — cinematic landing + pre-pivot explorer pages | **Frozen — do not touch; known-broken until rebuild** |

Removed: `apps/api` (Express read layer) — deleted 2026-11-15 so the concurrent frontend rebuild targets the Go API, not the old routes (git history has it).

## Key decisions (locked unless revisited)

* Chain: **Avalanche — Fuji testnet first (chain 43113), decided 2026-11-14** (supersedes Monad). Identity stack redeploys to Fuji in Phase 0 (docs/market.md); the Monad testnet deployment (chain 10143) is legacy read-only.
* Contracts toolchain: **Foundry** in `contracts/` (root-level, not a pnpm workspace member). In-house ERC721 base, no OZ.
* Identity stack: minimal ERC-8004-style registry + ERC-5192 soulbound attestations. Nothing else survived the pivot (Passport/Vault/DemoFX deleted 2026-11-14).
* API envelope: `{ success, data, message? }` via `createApiResponse`; errors via `createApiErrorResponse` (`packages/utils`). The Go gqlgen API mirrors this shape; paths land in `packages/config` when it ships.
* No derived score/risk anywhere: standing comes from attested settlements, not formulas.
* Frontend env: `NEXT_PUBLIC_API_URL` — base URL of the **Go API** (TBD until Phase 3 ships it; the old `localhost:4000` Express app is gone).

## Open questions (TBD — do not guess)

* [x] Pool graph source: own demo pools vs indexing existing DEX pools? → **own demo pools first** (docs/market.md, 2026-11-14).
* [ ] Market parameters: fee bps, quote TTL, who submits `executeSwap`, x402 rail on Fuji — proposals in docs/market.md, owner to lock.
* [ ] Attestation schema for market outcomes (current enum: STAKE/UNSTAKE/HARVEST/SWAP — likely rework → redeploy + reindex; v1 reuses SWAP).
* [ ] Quote protocol details: signature scheme, graph snapshot versioning, quote TTL + retraction semantics.
* [ ] Avalanche C-Chain mainnet switch; Envio cloud deploy (`ENVIO_API_TOKEN`).
