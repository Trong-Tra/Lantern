# @lantern/indexer — Envio HyperIndex on Monad testnet

Indexes the three Lantern identity contracts (docs/02) into a GraphQL API.

## What it indexes

| Contract | Events | Entities written |
| --- | --- | --- |
| `AgentRegistry` | `AgentRegistered`, `AgentUpdated` | `Agent` |
| `AgentPassport` (ERC-721) | `Transfer` | `Passport` (mint + holder updates) |
| `Reputation` (ERC-5192) | `AttestationMinted` | `Attestation` |

Entity ids = on-chain numeric ids as decimal strings (`Agent.id` = agentId,
`Passport.id`/`Attestation.id` = tokenId).

## Design notes

- **Chain**: Monad testnet, chain id 10143, native HyperSync (no RPC sync config).
- **Fields the events don't carry are resolved on-chain** via the Effect API
  (`src/effects.ts`, cached + rate-limited): `Transfer` has no agentId/uri →
  `agentOf`/`tokenURI`; `AttestationMinted` has no amount/protocol/uri →
  `getAttestation`. This avoids a contract redeploy — if the contracts ever
  gain richer events, drop the effects and read from `event.params`.
- **Enums** (`ActionType`, `ActionResult`) are stored as schema enums; uint8
  indices are mapped in `src/mappings.ts`.
- **Tx entity** from the original docs/05 proposal is intentionally omitted
  (KISS); revisit when the Snap needs raw transaction context.

## Env

See `.env.example`. `ENVIO_API_TOKEN` (https://envio.dev/app/api-tokens) is
required for HyperSync in V3 — both locally and on Envio Cloud (dashboard →
Environment Variables, `ENVIO_` prefix only). RPC for effects falls back:
`ENVIO_MONAD_RPC_URL` → `MONAD_TESTNET_RPC_URL` (root `.env`) → public HyperRPC.

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
`ENVIO_MONAD_RPC_URL`) in the dashboard. The public endpoint becomes
`https://indexer.dev.hyperindex.xyz/<deployment-id>/v1/graphql` → paste into
root `.env` as `ENVIO_GRAPHQL_URL`.

Cloud constraints honored here: `envio` pinned in `dependencies`,
`packageManager: pnpm@10.32.0`, node ≥ 22.15, all imports stay inside `indexer/`.
