# Lantern — Developer Guide

Source navigation, setup, and how to run every part of the monorepo.

> **Pivot state (2026-11-14):** the backend (contracts, API, indexer, packages) is pruned to the identity stack and ready for the market build (`docs/market.md`). `apps/web` is **frozen** — it still references removed APIs/types and is not expected to typecheck or fully work until the frontend rebuild. Commands for it are omitted on purpose.

## Repo layout

```
Lantern/                          # pnpm monorepo (pnpm@12.4.2)
├── AGENTS.md                     # cold-start protocol for AI agents (read first)
├── MEMORY.md                     # living log — current state + decisions + TBD (single truth)
├── README.md                     # product README
├── package.json                  # root workspace scripts
├── pnpm-workspace.yaml           # workspaces: apps/*, packages/*, indexer
├── .env.example                  # root env template (copy to .env, never commit .env)
├── contracts/                    # Foundry (Solidity) — identity contracts
│   ├── src/                      # AgentRegistry (ERC-8004), Reputation (ERC-5192), utils/
│   ├── test/                     # Forge tests
│   ├── script/                   # Deploy + seed scripts, seed JSON
│   ├── foundry.toml
│   └── README.md
├── apps/api/                     # Express 5 backend (port 4000)
│   ├── src/
│   │   ├── index.ts              # app entry; loads .env FIRST via loadEnv.ts
│   │   ├── app.ts                # Express app factory (repository injectable)
│   │   ├── routes/               # agent endpoints
│   │   └── repositories/         # AgentRepository interface + Envio implementation
│   ├── src/**/*.test.ts          # API tests (run with tsx)
│   └── package.json
├── apps/web/                     # Next.js 16 — FROZEN pre-pivot, do not touch
├── packages/                     # shared workspace libs
│   ├── config/                   # endpoint paths, explorer URLs
│   ├── types/                    # shared TS types (AgentSummary, Attestation)
│   └── utils/                    # envelope + formatting helpers
└── indexer/                      # Envio HyperIndex (local Hasura GraphQL :8080)
```

## Prerequisites

- **Node.js** (v20+), **pnpm@12.4.2** (root packageManager)
- **Foundry** (`forge`, `cast`) — for contracts
- **Docker / OrbStack** — only for the Envio indexer (Hasura on :8080)
- An **Avalanche Fuji RPC** (`AVAX_FUJI_RPC_URL`) — required for anything that touches chain

## One-time setup

```bash
# 1. Install all workspace deps
pnpm install

# 2. Create env file from template (never commit real values)
cp .env.example .env

# 3. Fill in .env with at least:
#    AVAX_FUJI_RPC_URL  (or DEPLOYER_PRIVATE_KEY for deployments)
#    AGENT_REGISTRY_ADDRESS, REPUTATION_ADDRESS
#    ENVIO_GRAPHQL_URL  (optional; defaults to local http://localhost:8080/v1/graphql)
```

## How to run

### Root (convenience scripts)

```bash
pnpm dev:api      # Express API (tsx watch)
pnpm build:api    # tsc
pnpm typecheck    # tsc --noEmit across workspaces (apps/web excluded while frozen — it will fail)
```

### Contracts (Foundry)

```bash
cd contracts
forge test              # all contract tests (53/53)
forge build             # compile
cast <...>              # on-chain interaction (see script/*.s.sol)
```

Deployed addresses live in root `.env` and `docs/contracts.md`.

### API (Express, port 4000)

```bash
cd apps/api
pnpm dev        # tsx watch src/index.ts  (hot reload)
pnpm start      # node dist/index.js      (after pnpm build)
pnpm test       # node --import tsx --test "src/**/*.test.ts"  (18 tests)
pnpm build      # tsc
```

The API reads the Envio indexer GraphQL (`ENVIO_GRAPHQL_URL`, default local Hasura
`http://localhost:8080/v1/graphql`). It must load `.env` before module-scope repository
creation — see `apps/api/src/loadEnv.ts` (imported first in `index.ts`).

### Envio indexer

```bash
cd indexer
pnpm dev        # OrbStack/Docker — Hasura GraphQL on :8080 (admin secret: testing)
pnpm test       # vitest, in-memory (4 tests)
```

Blocked from cloud deploy until `ENVIO_API_TOKEN` is set.

## How to run tests

| Area | Command | Where |
|------|---------|-------|
| Contracts | `forge test` | `contracts/` |
| API | `pnpm test` | `apps/api/` |
| Indexer | `pnpm test` | `indexer/` |
| Backend typecheck | `pnpm --filter @lantern/api exec tsc --noEmit` etc. | per workspace |

## Key env vars

| Var | Where | Purpose |
|-----|-------|---------|
| `AVAX_FUJI_RPC_URL` | root `.env` | Avalanche Fuji RPC (contracts, indexer effects) |
| `DEPLOYER_PRIVATE_KEY` | root `.env` | deployer key (contracts deployment) |
| `AGENT_REGISTRY_ADDRESS` / `REPUTATION_ADDRESS` | root `.env` | deployed identity contract addresses |
| `ENVIO_GRAPHQL_URL` / `ENVIO_ADMIN_SECRET` | root `.env` | Hasura GraphQL endpoint / secret |
| `ENVIO_API_TOKEN` / `ENVIO_AVAX_FUJI_RPC_URL` | `indexer/.env` | HyperSync token / RPC for effects |

## Cold-start protocol (for agents / new contributors)

Read, in order:
1. Root `AGENTS.md` — hard rules + conventions
2. `MEMORY.md` §Current state — what exists NOW (wins over docs on conflict)
3. **One** layer doc for your task — map in `AGENTS.md`

Never invent contract addresses, URLs, scores, or tx hashes — mark `TBD` instead. Docs + code change in the same commit.
