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
                              │ REST (envelope via packages/utils)
┌─────────────────────────────▼───────────────────────────────┐
│ API (apps/api, Express 5)                                   │
│ TODAY: identity read layer (agents + attestations)          │
│ TBD: pool-graph serving, quote intents, solution submission │
└─────────────────────────────┬───────────────────────────────┘
                              │ GraphQL (read)
┌─────────────────────────────▼───────────────────────────────┐
│ INDEXING (Envio HyperIndex, Avalanche Fuji 43113)           │
│ Indexes: AgentRegistered/Updated, AttestationMinted         │
│ TBD: pool/trade events once market contracts exist          │
└─────────────────────────────┬───────────────────────────────┘
                              │ events
┌─────────────────────────────▼───────────────────────────────┐
│ ON-CHAIN (Avalanche, Foundry)                               │
│ TODAY: AgentRegistry (ERC-8004) + Reputation (ERC-5192)     │
│ TBD: demo pools + LanternMarket (signed-quote settlement,   │
│      fees) — design in docs/market.md, params in MEMORY TBD │
└─────────────────────────────▲───────────────────────────────┘
                              │ off-chain solvers
┌─────────────────────────────┴───────────────────────────────┐
│ SOLVERS (off-chain agents, TBD — not built)                 │
│ Read the pool graph, compute routes + split allocations,    │
│ submit solutions. ERC-8004 identity binds payout + record.  │
└─────────────────────────────────────────────────────────────┘
```

## Repo mapping (today)

| Layer | Repo location | Status |
| --- | --- | --- |
| Identity + market contracts | `contracts/src/{AgentRegistry,Reputation,MockToken,DemoPool,LanternMarket}.sol` + `src/utils/` (in-house ERC721/Ownable), tests in `test/`, deploy/seed in `script/` | Phase 0 code done 2026-11-14; Fuji deploy pending owner faucet AVAX; Monad deployment legacy; `forge test` 93/93 |
| Indexing | `indexer/` — Envio HyperIndex v3: `config.yaml` + `schema.graphql` + `src/handlers/` + `src/effects.ts` + vitest | Local (Docker; GraphQL :8080); cloud deploy pending `ENVIO_API_TOKEN` |
| API | `apps/api/src/` — `app.ts` (factory, injectable repository), `routes/agents.ts`, `repositories/{agentRepository,envioAgentRepository}.ts`, `loadEnv.ts` | Envio-backed only; 18 tests |
| Shared libs | `packages/config` (endpoint paths, explorer URLs), `packages/types` (agent/attestation types), `packages/utils` (envelope, formatting) | Done, extend as needed |
| Web | `apps/web/` — cinematic landing + pre-pivot explorer pages | **Frozen — do not touch; known-broken until rebuild** |

## Key decisions (locked unless revisited)

* Chain: **Avalanche — Fuji testnet first (chain 43113), decided 2026-11-14** (supersedes Monad). Identity stack redeploys to Fuji in Phase 0 (docs/market.md); the Monad testnet deployment (chain 10143) is legacy read-only.
* Contracts toolchain: **Foundry** in `contracts/` (root-level, not a pnpm workspace member). In-house ERC721 base, no OZ.
* Identity stack: minimal ERC-8004-style registry + ERC-5192 soulbound attestations. Nothing else survived the pivot (Passport/Vault/DemoFX deleted 2026-11-14).
* API envelope: `{ success, data, message? }` via `createApiResponse`; errors via `createApiErrorResponse` (`packages/utils`). All endpoint paths in `packages/config`.
* No derived score/risk anywhere: standing comes from attested settlements, not formulas.
* Frontend env: `NEXT_PUBLIC_API_URL` (fallback `http://localhost:4000` via `getApiBaseUrl`). Backend env: `PORT`.

## Open questions (TBD — do not guess)

* [x] Pool graph source: own demo pools vs indexing existing DEX pools? → **own demo pools first** (docs/market.md, 2026-11-14).
* [ ] Market parameters: fee bps, quote TTL, who submits `executeSwap`, x402 rail on Fuji — proposals in docs/market.md, owner to lock.
* [ ] Attestation schema for market outcomes (current enum: STAKE/UNSTAKE/HARVEST/SWAP — likely rework → redeploy + reindex; v1 reuses SWAP).
* [ ] Quote protocol details: signature scheme, graph snapshot versioning, quote TTL + retraction semantics.
* [ ] Avalanche C-Chain mainnet switch; Envio cloud deploy (`ENVIO_API_TOKEN`).
