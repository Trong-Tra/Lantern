# Lantern Finance — Agent Root

> **Cold start: read THIS file + `MEMORY.md` §Current state + the ONE doc for your task. Budget ~3k tokens.**
> Rule: **MEMORY §Current state is the only source of truth for what exists NOW.** Docs describe target design. On conflict, MEMORY wins — fix the doc in the same commit.

* Product: **Lantern Finance Graph + Market on Avalanche** (Fuji testnet first). Lantern Finance Graph = the x402-paid live pool-graph feed (assets = nodes, pools = edges) that solver agents buy instead of running their own indexing. Lantern Finance Market = the streaming-quote market: solver agents (ERC-8004 identities) answer each swap intent with signed route+split-allocation quotes that arrive one by one; the user picks one, only the picked quote settles on-chain, the fee goes to its solver. Track record = soulbound ERC-5192 attestations of real settlements (earned, never claimed).
* Stack: pnpm monorepo — `apps/web` (Next.js 16, **FROZEN — do not touch**), `packages/{config,types,utils}`, `contracts/` (Foundry: AgentRegistry + Reputation + Phase 0 market contracts MockToken/DemoPool/LanternMarket), `indexer/` (Envio), `services/market/` (Go module — **the only backend**, Phases 1–2 done; gqlgen API = Phase 3/4). `apps/api` (old Express read layer) was **removed 2026-11-15** — the frontend must target the Go API, not the old Express routes (git history has it).
* The market itself is **partially built**: Fuji contracts deployed + Go quote flow (protocol WS, reference solver, settlement e2e passing) exist; x402 paywall, protocol hardening, and the gqlgen API are Phase 3 — build plan in `docs/market.md`, open items in MEMORY §TBD. Old-concept code (agent personas, chat, scores, DemoFX corridor, vault, passport, Snap, apps/api) was deleted; git history has it if truly needed.

## Doc map (read ONE, on demand)

| Task | Read |
| --- | --- |
| Any task | `MEMORY.md` §Current state |
| Architecture / repo layout | `docs/architecture.md` |
| **Graph + Market build plan (Go backend + contracts)** | `docs/market.md` |
| Contracts | `docs/contracts.md` |
| Deployment (free tier: Vercel + Render + Envio Cloud) | `docs/deploy.md` |
| API / backend | `docs/api.md` (removed → Go API plan) |
| Envio indexer | `docs/indexer.md` |

Vision: `docs/00-vision.md` (owner-only changes). `docs/frontend.md` describes the frozen pre-pivot frontend — historical until the frontend rebuild. This table is the only doc map — `docs/README.md` just points back here.

## Sync protocol (every session)

1. Read `MEMORY.md` §Current state + your one doc from the map.
2. `git log --oneline -5` + `git status --short` for drift since last sync.
3. After the task: append a ≤4-line entry to `MEMORY.md` log (newest on top) + update Current state/TBD if changed.

## Hard rules

* Before any UI design or layout implementation, research content visibility, scrolling and touch/pointer reach for mobile and desktop. Follow `docs/frontend.md` §Placement research and stable controls; keep shared navigation positions stable across routes.
* `TBD` > invented values — never fabricate addresses, URLs, scores, tx hashes.
* Never commit `.env` values; `.env.example` keys only. No `node_modules`/`dist`/`.next`.
* **`apps/web` is frozen: never edit frontend files in backend sessions.** It is known-broken (references removed API/types) until its own rebuild.
* One router per resource; envelope via `createApiResponse` (`packages/utils`); endpoints/paths in `packages/config`.
* Small, verifiable commits; run typecheck + tests for touched areas (contracts: `forge test`; market: `go test ./...`; indexer: vitest + tsc).

## Handoff format (commit msg / chat)

```
Done: [what + files]
Docs updated: [which docs/ files]
TBD/blocked: [what you need + owner]
Verified: [commands run]
```
