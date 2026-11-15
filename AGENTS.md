# Lantern — Agent Root

> **Cold start: read THIS file + `MEMORY.md` §Current state + the ONE doc for your task. Budget ~3k tokens.**
> Rule: **MEMORY §Current state is the only source of truth for what exists NOW.** Docs describe target design. On conflict, MEMORY wins — fix the doc in the same commit.

* Product: **Lantern Graph + Market on Avalanche** (Fuji testnet first). Lantern Graph = the x402-paid live pool-graph feed (assets = nodes, pools = edges) that solver agents buy instead of running their own indexing. Lantern Market = the streaming-quote market: solver agents (ERC-8004 identities) answer each swap intent with signed route+split-allocation quotes that arrive one by one; the user picks one, only the picked quote settles on-chain, the fee goes to its solver. Track record = soulbound ERC-5192 attestations of real settlements (earned, never claimed).
* Stack: pnpm monorepo — `apps/api` (Express 5), `apps/web` (Next.js 16, **FROZEN — do not touch**), `packages/{config,types,utils}`, `contracts/` (Foundry: AgentRegistry + Reputation + Phase 0 market contracts MockToken/DemoPool/LanternMarket), `indexer/` (Envio), `services/market/` (Go module, Phase 1 skeleton).
* The market itself is **partially built**: contracts (undeployed) + Go skeleton (config, Envio WS ingest, graph store, chaincheck) exist; quote protocol, solver, x402 paywall, gqlgen API are Phases 2–3 — build plan in `docs/market.md`, open items in MEMORY §TBD. Old-concept code (agent personas, chat, scores, DemoFX corridor, vault, passport, Snap) was deleted 2026-11-14; git history has it if truly needed.

## Doc map (read ONE, on demand)

| Task | Read |
| --- | --- |
| Any task | `MEMORY.md` §Current state |
| Architecture / repo layout | `docs/architecture.md` |
| **Graph + Market build plan (Go backend + contracts)** | `docs/market.md` |
| Contracts | `docs/contracts.md` |
| API / backend | `docs/api.md` |
| Envio indexer | `docs/indexer.md` |

Vision: `docs/00-vision.md` (owner-only changes). `docs/frontend.md` describes the frozen pre-pivot frontend — historical until the frontend rebuild. This table is the only doc map — `docs/README.md` just points back here.

## Sync protocol (every session)

1. Read `MEMORY.md` §Current state + your one doc from the map.
2. `git log --oneline -5` + `git status --short` for drift since last sync.
3. After the task: append a ≤4-line entry to `MEMORY.md` log (newest on top) + update Current state/TBD if changed.

## Hard rules

* `TBD` > invented values — never fabricate addresses, URLs, scores, tx hashes.
* Never commit `.env` values; `.env.example` keys only. No `node_modules`/`dist`/`.next`.
* **`apps/web` is frozen: never edit frontend files in backend sessions.** It is known-broken (references removed API/types) until its own rebuild.
* One router per resource; envelope via `createApiResponse` (`packages/utils`); endpoints/paths in `packages/config`.
* Small, verifiable commits; run typecheck + tests for touched areas (contracts: `forge test`; api: `pnpm --filter @lantern/api test`; indexer: vitest + tsc).

## Handoff format (commit msg / chat)

```
Done: [what + files]
Docs updated: [which docs/ files]
TBD/blocked: [what you need + owner]
Verified: [commands run]
```
