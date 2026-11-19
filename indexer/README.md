# @lantern/indexer — Envio HyperIndex on Avalanche Fuji

Indexes the Lantern Finance identity + market contracts (docs/contracts.md) into a GraphQL API.

## What it indexes

| Contract | Events | Entities written |
| --- | --- | --- |
| `AgentRegistry` | `AgentRegistered`, `AgentUpdated` | `Agent` |
| `Reputation` (ERC-5192) | `AttestationMinted` | `Attestation` |
| `DemoPool` | `Sync` | `Pool` |
| `LanternMarket` | `TradeSettled` | `Trade` |

Entity ids: `Agent.id` = agentId, `Attestation.id` = tokenId (decimal strings),
`Pool.id` = pool address, `Trade.id` = settlement tx hash.

## Design notes

- **Chain**: Avalanche Fuji, chain id 43113, native HyperSync (no RPC sync config). Contract addresses in `config.yaml` are zero-address placeholders until the Fuji redeploy (Phase 0).
- **Fields the events don't carry are resolved on-chain** via the Effect API
  (`src/effects.ts`, cached + rate-limited): `AttestationMinted` has no
  amount/protocol/uri → `getAttestation`; `DemoPool.Sync` has no token pair →
  `token0()`/`token1()` once per pool (immutable, cached forever).
- **`Sync` is the reserve source of truth** — it fires on `seed()` and after
  every `swap()`, so `DemoPool.Swap` is not indexed (revisit for volume analytics).
- **Enums** (`ActionType`, `ActionResult`) are stored as schema enums; uint8
  indices are mapped in `src/mappings.ts`.

## Env

See `.env.example`. `ENVIO_API_TOKEN` (https://envio.dev/app/api-tokens) is
required for HyperSync in V3 — both locally and on Envio Cloud (dashboard →
Environment Variables, `ENVIO_` prefix only). RPC for effects falls back:
`ENVIO_AVAX_FUJI_RPC_URL` → `AVAX_FUJI_RPC_URL` (root `.env`) → public HyperRPC
(`fuji.hypersync.xyz`).

## Commands

```bash
pnpm install        # from repo root (workspace member)
pnpm codegen        # regenerate .envio/ types after config/schema changes
pnpm test           # vitest — in-memory handler tests (no Docker, no chain)
pnpm typecheck      # tsc --noEmit
pnpm dev            # local Postgres + Hasura + indexer (needs Docker)
```

Local GraphQL: `http://localhost:8080/v1/graphql` (admin secret `testing`).
Hasura console opens automatically at `http://localhost:8080`.

## Deploy (Envio Cloud)

Git-based, no CLI login: install the **Envio Deployments** GitHub App →
dashboard → Add Indexer → root directory `indexer/`, config `config.yaml`,
branch `main` → push. Set `ENVIO_API_TOKEN` (and optionally
`ENVIO_AVAX_FUJI_RPC_URL`) in the dashboard. The public endpoint becomes
`https://indexer.dev.hyperindex.xyz/<deployment-id>/v1/graphql` → paste into
root `.env` as `ENVIO_GRAPHQL_URL`.

Cloud constraints honored here: `envio` pinned in `dependencies`,
`packageManager: pnpm@10.32.0`, node ≥ 22.15, all imports stay inside `indexer/`.
