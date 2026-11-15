# 03 — Backend API

> **`apps/api` (Express) was removed 2026-11-15** — owner decision: one backend, `services/market/` (Go). This page is a tombstone so nobody — especially the frontend — codes against the old Express routes. They are gone from `main` (git history: `git show <sha>:apps/api/…`).

## Where the backend lives now

| Concern | Where |
| --- | --- |
| Quote protocol WS, solver, settlement | `services/market/` — **built** (Phases 1–2, e2e passing on Fuji) |
| Web-facing GraphQL (identity reads + market queries) | `services/market/internal/api` (gqlgen) — **not built** (Phase 3/4, plan in `docs/market.md`) |
| Raw data | Envio indexer GraphQL (`indexer/`) |

## Rules for the frontend

* **Do not** target `http://localhost:4000`, `/api/agents…`, or `API_ENDPOINTS` from `packages/config` — those paths belonged to the removed Express app and are stale.
* The FE contract will be the gqlgen API (schema lands with Phase 3). Until it exists, treat identity reads as `TBD` — wire mocks, not the old API.
* Envelope convention stays: `{ success, data, message? }` via `createApiResponse` (`packages/utils`) — it will be mirrored by the Go API.

## What the old API was (history)

Pruned 2026-11-14: chat personas, Lumen score, risk banding, Snap lookup, mock data source. Final state: `GET /`, `GET /api/hello`, `GET /api/agents`, `GET /api/agents/:id`, `GET /api/agents/:id/attestations` over Envio GraphQL only (18 tests, all green at removal). Types in `packages/types` (`AgentSummary`, `AgentProfile`, `Attestation`) remain valid and will back the gqlgen API.
