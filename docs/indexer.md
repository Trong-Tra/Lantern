# 05 — Integrations (Envio)

> **Integrations layer detail. Current state: `MEMORY.md` §Current state (wins on conflict).** Pruned 2026-11-14: MetaMask Snap, OpenRouter chat, and Dynamic passkey wallet were removed with the old concepts (git history). Envio is the only surviving integration.

## Envio — indexing on Monad

* Goal: HyperIndex indexes `AgentRegistered/Updated` + `AttestationMinted` → GraphQL for the API. Arena contracts will be added to `config.yaml` once they exist.
* Status: **live locally** — `indexer/` (Envio HyperIndex v3): `config.yaml` (2 contracts on chain 10143, native HyperSync), `schema.graphql` (`Agent`, `Attestation`), TS handlers (`src/handlers/`), on-chain field resolution via Effect API (`src/effects.ts`: `AttestationMinted` lacks amount/protocol/uri, so the handler reads `getAttestation` from contract storage, cached — avoids a contract redeploy).
* Verified: vitest handler tests green (in-memory, no Docker); typecheck clean. Local GraphQL: `http://localhost:8080/v1/graphql` (admin secret `testing`, OrbStack/Docker).
* Deploy: GitHub-based (no CLI login) — Envio Deployments app → Add Indexer → root `indexer/`, config `config.yaml`, branch `main` → push. Cloud constraints honored: envio pinned in deps, `packageManager: pnpm@10.32.0`, node ≥ 22.15, imports contained in `indexer/`. **Blocked on: `ENVIO_API_TOKEN`** (V3 HyperSync requires it, local + cloud — owner creates at envio.dev/app/api-tokens) → then `pnpm dev` locally (Docker) and cloud deploy; endpoint → `ENVIO_GRAPHQL_URL`.
* Env keys (`.env.example` root + `indexer/`): `ENVIO_API_TOKEN`, `ENVIO_MONAD_RPC_URL` (fallback chain: → `MONAD_TESTNET_RPC_URL` → public HyperRPC), `ENVIO_GRAPHQL_URL`.

## Cross-cutting

* Secrets (`ENVIO_*`, `MONAD_*`) go in `.env.example` only as keys, never values.
* Each integration must update its section here + the relevant layer doc in the same commit.
