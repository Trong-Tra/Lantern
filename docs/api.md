# 03 — Backend API

> **`apps/api` (Express) was removed 2026-11-15** — owner decision: one backend, `services/market/` (Go). This page is a tombstone so nobody — especially the frontend — codes against the old Express routes. They are gone from `main` (git history: `git show <sha>:apps/api/…`).

## Where the backend lives now

| Concern | Where |
| --- | --- |
| Quote protocol WS, solver, settlement | `services/market/` — **built** (Phases 1–2, e2e passing on Fuji) |
| Web-facing GraphQL (identity reads + market queries) | `services/market/internal/api` (gqlgen) — **built 2026-11-16** (Phase 3): `POST/GET /graphql` + `/healthz` on `:8082` (`API_ADDR`); schema = `internal/api/schema.graphqls` |
| Graph snapshot feed | `GET /graph/snapshot` on `:8082` — **built 2026-11-16**, x402-paywalled (`internal/paywall` + `internal/graphfeed`; open while `X402_*` terms unset) |
| Raw data | Envio indexer GraphQL (`indexer/`) |

## Rules for the frontend

* **Do not** target `http://localhost:4000`, `/api/agents…`, or `API_ENDPOINTS` from `packages/config` — those paths belonged to the removed Express app and are stale.
* The FE contract is the gqlgen API: generate/mocks from `services/market/internal/api/schema.graphqls` (Query `agents`, `agent(id)`, `attestations(agentId)`, `pools`, `trades`). GraphQL responses are standard `{ data, errors }` JSON — the `createApiResponse` envelope does not apply to `/graphql`.
* Graph data for the pool visualizer: `GET /graph/snapshot` → `{ pools: [{ address, token0, token1, reserve0, reserve1, updatedAtBlock }], count }` (reserves are decimal strings). Paywalled only when the owner sets `X402_ASSET`/`X402_PAY_TO`/`X402_AMOUNT`; otherwise open.

## What the old API was (history)

Pruned 2026-11-14: chat personas, Lumen score, risk banding, Snap lookup, mock data source. Final state: `GET /`, `GET /api/hello`, `GET /api/agents`, `GET /api/agents/:id`, `GET /api/agents/:id/attestations` over Envio GraphQL only (18 tests, all green at removal). Types in `packages/types` (`AgentSummary`, `AgentProfile`, `Attestation`) remain valid and will back the gqlgen API.
