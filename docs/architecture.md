# 01 — Architecture

> **TARGET design.** Current state lives in `MEMORY.md` §Current state — MEMORY wins on any conflict.

## Concept (pivot 3, 2026-11-14)

Lantern is a **competitive multihop swap routing arena** — Matcha-style aggregation, but the solver set is an open network of on-chain-identified agents instead of a closed/market-maker set.

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
│ INDEXING (Envio HyperIndex, Monad testnet 10143)            │
│ Indexes: AgentRegistered/Updated, AttestationMinted         │
│ TBD: pool/swap events once arena contracts exist            │
└─────────────────────────────┬───────────────────────────────┘
                              │ events
┌─────────────────────────────▼───────────────────────────────┐
│ ON-CHAIN (Monad, Foundry)                                   │
│ TODAY: AgentRegistry (ERC-8004) + Reputation (ERC-5192)     │
│ TBD: pool graph + arena (intents, solutions, settlement,    │
│      fees) contracts — design open, see MEMORY §TBD         │
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
| Identity contracts | `contracts/src/{AgentRegistry,Reputation}.sol` + `src/utils/` (in-house ERC721/Ownable), tests in `test/`, deploy/seed in `script/` | **Live on testnet** (chain 10143); `forge test` 53/53 |
| Indexing | `indexer/` — Envio HyperIndex v3: `config.yaml` + `schema.graphql` + `src/handlers/` + `src/effects.ts` + vitest | Local (Docker; GraphQL :8080); cloud deploy pending `ENVIO_API_TOKEN` |
| API | `apps/api/src/` — `app.ts` (factory, injectable repository), `routes/agents.ts`, `repositories/{agentRepository,envioAgentRepository}.ts`, `loadEnv.ts` | Envio-backed only; 18 tests |
| Shared libs | `packages/config` (endpoint paths, explorer URLs), `packages/types` (agent/attestation types), `packages/utils` (envelope, formatting) | Done, extend as needed |
| Web | `apps/web/` — cinematic landing + pre-pivot explorer pages | **Frozen — do not touch; known-broken until rebuild** |

## Key decisions (locked unless revisited)

* Chain: Monad — **testnet first** (owner 2026-10-02). Live: chain ID 10143 via `MONAD_TESTNET_RPC_URL`.
* Contracts toolchain: **Foundry** in `contracts/` (root-level, not a pnpm workspace member). In-house ERC721 base, no OZ.
* Identity stack: minimal ERC-8004-style registry + ERC-5192 soulbound attestations. Nothing else survived the pivot (Passport/Vault/DemoFX deleted 2026-11-14).
* API envelope: `{ success, data, message? }` via `createApiResponse`; errors via `createApiErrorResponse` (`packages/utils`). All endpoint paths in `packages/config`.
* No derived score/risk anywhere: the arena settles standing from attested outcomes, not formulas.
* Frontend env: `NEXT_PUBLIC_API_URL` (fallback `http://localhost:4000` via `getApiBaseUrl`). Backend env: `PORT`.

## Open questions (TBD — do not guess)

* [ ] Pool graph source: own demo pools vs indexing existing Monad DEX pools?
* [ ] Arena mechanics: solution format, winner selection (best-quote vs auction), fee split, solver bonding/slashing?
* [ ] Attestation schema for arena outcomes (current enum: STAKE/UNSTAKE/HARVEST/SWAP — likely rework → redeploy + reindex).
* [ ] Solver protocol: how off-chain solvers authenticate, fetch graph snapshots, and submit.
* [ ] Monad mainnet switch; Envio cloud deploy (`ENVIO_API_TOKEN`).
