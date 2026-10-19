# Lantern — Developer Guide

Source navigation, setup, and how to run every part of the monorepo.

## Repo layout

```
Lantern/                          # pnpm monorepo (pnpm@12.4.2)
├── AGENTS.md                     # cold-start protocol for AI agents (read first)
├── MEMORY.md                     # living log — current state + decisions + TBD (single truth)
├── README.md                     # product README
├── package.json                  # root workspace scripts
├── pnpm-workspace.yaml           # workspaces: apps/*, packages/*, indexer
├── .env.example                  # root env template (copy to .env, never commit .env)
├── contracts/                    # Foundry (Solidity) — identity + agent-wallet contracts
│   ├── src/                      # AgentRegistry, AgentPassport, Reputation, AgentVault, DemoFXPool, mocks
│   ├── test/                     # Forge tests
│   ├── script/                   # deployment + seeder scripts
│   ├── foundry.toml
│   └── README.md
├── apps/api/                     # Express 5 backend (port 4000)
│   ├── src/
│   │   ├── index.ts              # app entry; loads .env FIRST via loadEnv.ts
│   │   ├── app.ts                # Express app + routes
│   │   ├── routes/               # agent endpoints, chat, Snap lookup
│   │   ├── repositories/         # scoring.ts (Lumen Score v1), envio/mock agent repos
│   │   └── services/             # OpenRouter chat
│   ├── src/**/*.test.ts          # API tests (run with tsx)
│   └── package.json
├── apps/web/                     # Next.js 16 (dev :3000, falls back to :3001)
│   ├── src/app/                  # App Router pages (/agent/[id], /wallet, /network, /docs)
│   ├── src/components/           # molecules: swap-demo-panel, vault-panel, agent-chat-panel
│   ├── src/libs/                 # chain.ts (Monad testnet), explorer/vault.ts (validateMonAmount)
│   ├── tests/*.test.mjs          # web tests (node --test)
│   └── .env.example              # web env template (copy to .env)
├── packages/                     # shared workspace libs
│   ├── config/                   # endpoints, paths, createApiResponse envelope, explorer URLs
│   ├── types/                    # shared TS types (AgentSummary, Attestation, ScoreEvent)
│   ├── utils/                    # shared utilities
│   └── snap/                     # MetaMask Snap (Transaction Insights)
└── indexer/                      # Envio HyperIndex (local Hasura GraphQL :8080)
```

## Prerequisites

- **Node.js** (v20+), **pnpm@12.4.2** (root packageManager)
- **Foundry** (`forge`, `cast`) — for contracts
- **Docker / OrbStack** — only for the Envio indexer (Hasura on :8080)
- A **Monad testnet RPC** (`NEXT_PUBLIC_MONAD_RPC_URL`) — required for anything that touches chain

## One-time setup

```bash
# 1. Install all workspace deps
pnpm install

# 2. Create env files from templates (never commit real values)
cp .env.example .env                    # root (API + contracts)
cp apps/web/.env.example apps/web/.env  # web (browser-side RPC)

# 3. Fill in .env with at least:
#    MONAD_TESTNET_RPC_URL  (or MONAD_PRIVATE_KEY for deployments)
#    NEXT_PUBLIC_MONAD_RPC_URL  (in apps/web/.env)
#    AGENT_REGISTRY_ADDRESS, AGENT_PASSPORT_ADDRESS, REPUTATION_ADDRESS
#    DEMO_FX_POOL_ADDRESS
#    AGENT_VAULT_ADDRESS
#    ENVIO_GRAPHQL_URL / DATA_SOURCE=envio  (optional; defaults to mock data)
```

## How to run

### Root (convenience scripts)

```bash
pnpm dev:web      # Next.js dev server
pnpm dev:api      # Express API (tsx watch)
pnpm build:web    # production build
pnpm build:api    # tsc
pnpm typecheck    # tsc --noEmit across all workspaces
```

### Contracts (Foundry)

```bash
cd contracts
forge test              # all contract tests (101/101)
forge test --match-contract DemoFXTest -vv   # agent-wallet corridor tests
forge test --match-contract LumenGasComparison -vv  # scoring gas proof
forge build             # compile
cast <...>              # on-chain interaction (see script/*.s.sol)
```

Deployed addresses live in root `.env` and `docs/02-identity-contracts.md`.

### API (Express, port 4000)

```bash
cd apps/api
pnpm dev        # tsx watch src/index.ts  (hot reload)
pnpm start      # node dist/index.js      (after pnpm build)
pnpm test       # node --import tsx --test "src/**/*.test.ts"  (85 tests)
pnpm build      # tsc
```

Key data-source switch: `DATA_SOURCE=envio` in root `.env` makes the API read live
indexer data from Hasura (`http://localhost:8080/v1/graphql`); otherwise it falls back
to mock data. The API must load `.env` before module-scope repository selection — see
`apps/api/src/loadEnv.ts` (imported first in `index.ts`).

### Web (Next.js 16)

```bash
cd apps/web
pnpm dev        # next dev   (:3000; falls back to :3001 if RAAC holds :3000)
pnpm build      # next build
pnpm start      # next start
pnpm lint       # eslint
pnpm test       # node --test tests/*.test.mjs  (36 tests)
```

Browser-side requirements: `NEXT_PUBLIC_MONAD_RPC_URL` in `apps/web/.env`. Without it,
agent-wallet and vault panels render a disabled notice. Connect a real injected wallet
(wagmi `injected` connector — MetaMask) on `/agent/1` or `/wallet`.

### MetaMask Snap

```bash
cd packages/snap
pnpm serve      # local Flask dev (:8081) + MetaMask Flask
```

Only needed for Transaction Insights; local dev only, public Snap ID TBD.

### Envio indexer

```bash
cd indexer
pnpm dev        # OrbStack/Docker — Hasura GraphQL on :8080 (admin secret: testing)
```

Blocked from cloud deploy until `ENVIO_API_TOKEN` is set.

## How to run tests

| Area | Command | Where |
|------|---------|-------|
| Contracts | `forge test` | `contracts/` |
| API | `pnpm test` | `apps/api/` |
| Web | `pnpm test` | `apps/web/` |
| All typecheck | `pnpm typecheck` | root |

## Lint / format

```bash
# web
cd apps/web && pnpm lint      # eslint
cd apps/web && pnpm format:check

# root
pnpm typecheck                # tsc --noEmit across workspaces
```

## Key env vars

| Var | Where | Purpose |
|-----|-------|---------|
| `MONAD_TESTNET_RPC_URL` | root `.env` | Monad testnet RPC (API/contracts) |
| `MONAD_PRIVATE_KEY` | root `.env` | deployer key (contracts deployment) |
| `NEXT_PUBLIC_MONAD_RPC_URL` | `apps/web/.env` | browser RPC (agent-wallet / vault panels) |
| `NEXT_PUBLIC_DEMO_FX_POOL_ADDRESS` | `apps/web/.env` | DemoFXPool address |
| `AGENT_REGISTRY_ADDRESS` / `AGENT_PASSPORT_ADDRESS` / `REPUTATION_ADDRESS` | root `.env` | deployed identity contract addresses |
| `AGENT_VAULT_ADDRESS` | root `.env` + `apps/web/.env` | AgentVault (deposit/withdraw panel) |
| `DATA_SOURCE` | root `.env` + `apps/web/.env` | `envio` = live indexer; anything else = mock |
| `ENVIO_GRAPHQL_URL` | root `.env` | Hasura GraphQL endpoint |
| `OPENAI_API_KEY` / `CHAT_MODEL` / `CHAT_MODEL_FALLBACKS` | root `.env` | OpenRouter chat |

## Cold-start protocol (for agents / new contributors)

Read, in order:
1. Root `AGENTS.md` — hard rules + conventions
2. `MEMORY.md` §Current state — what exists NOW (wins over docs on conflict)
3. **One** layer doc from `docs/00`–`05` or `08`–`11`, depending on your task

Never invent contract addresses, URLs, scores, or tx hashes — mark `TBD` instead. Docs + code change in the same commit.

## Architecture notes (2-wallet agent wallet)

The agent-wallet corridor (`swap-demo-panel.tsx`) uses a **2-wallet architecture**:

- **Agent wallet** — a separate permanent key (`localStorage` key `lantern.agentWallet.v1`), generated once, never regenerated → funds never lost. It **auto-signs every swap** via `viem` `createWalletClient`; the user's MetaMask is **never** prompted per trade.
- **User wallet (MetaMask)** — funds the agent wallet (send MON to agent address) and can **withdraw** from it anytime (agent auto-sends MON back, keeping a small gas reserve).

Funds live in the agent wallet directly; `DemoFXPool.sol` is swap-only (no pool credit/parking).

## Do not build on

Dead code — never use as a reference or foundation:
- `apps/web/src/containers/home|experience|lantern`
- `apps/web/styles/globals.scss`
- `docs/06-agent-sync.md`, `docs/07-first-slice-plan.md`, `docs/09-video-scripts.md` (archived)
