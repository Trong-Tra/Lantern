# 05 — Integrations (Envio)

> **Integrations layer detail. Current state: `MEMORY.md` §Current state (wins on conflict).** Pruned 2026-11-14: MetaMask Snap, OpenRouter chat, and Dynamic passkey wallet were removed with the old concepts (git history). Envio is the only surviving integration.

## Envio — indexing (Avalanche Fuji, chain 43113)

> Re-pointed to Fuji 2026-11-14 (Phase 0). Contract addresses in `config.yaml` are zero-address placeholders until the Fuji redeploy runs (pending owner faucet AVAX); the legacy Monad deployment (10143) is no longer indexed.

* Goal: HyperIndex indexes `AgentRegistered/Updated`, `AttestationMinted`, `DemoPool.Sync`, `LanternMarket.TradeSettled` → GraphQL for the API + the Go market service (Hasura subscriptions as the realtime feed, Phase 1).
* Status: `indexer/` (Envio HyperIndex v3): `config.yaml` (4 contracts on chain 43113, native HyperSync), `schema.graphql` (`Agent`, `Attestation`, `Pool`, `Trade`), TS handlers (`src/handlers/`), on-chain field resolution via Effect API (`src/effects.ts`: `AttestationMinted` lacks amount/protocol/uri → `getAttestation`; `DemoPool.Sync` lacks the token pair → `token0()`/`token1()` once per pool, cached).
* Pool reserves come from `Sync` alone — it fires on `seed()` and after every `swap()`, so the `Swap` event is deliberately not indexed (revisit if volume analytics need it).
* Verified: vitest handler tests green (in-memory, no Docker); typecheck clean. Local GraphQL: `http://localhost:8080/v1/graphql` (admin secret `testing`, OrbStack/Docker).
* Deploy: GitHub-based (no CLI login) — Envio Deployments app → Add Indexer → root `indexer/`, config `config.yaml`, branch `main` → push. Cloud constraints honored: envio pinned in deps, `packageManager: pnpm@10.32.0`, node ≥ 22.15, imports contained in `indexer/`. **Blocked on: `ENVIO_API_TOKEN`** (V3 HyperSync requires it, local + cloud — owner creates at envio.dev/app/api-tokens) → then `pnpm dev` locally (Docker) and cloud deploy; endpoint → `ENVIO_GRAPHQL_URL`.
* Env keys (`.env.example` root + `indexer/`): `ENVIO_API_TOKEN`, `ENVIO_AVAX_FUJI_RPC_URL` (fallback chain: → `AVAX_FUJI_RPC_URL` → public HyperRPC `fuji.hypersync.xyz`), `ENVIO_GRAPHQL_URL`.

## Cross-cutting

* Secrets (`ENVIO_*`, `*_PRIVATE_KEY`) go in `.env.example` only as keys, never values.
* Each integration must update its section here + the relevant layer doc in the same commit.
