# Lantern

Passport-native agent identity + reputation on Monad (ERC-8004 + ERC-721 Passport + ERC-5192 soulbound). Explorer + MetaMask Snap verification.

**FinTechathon Track F — Agent Wallet.** A user signs once, their agent wallet trades autonomously, every action is attested to a soulbound passport, computed into a Lumen Score, and enforced through score-gated permissions. The user can withdraw their money anytime.

## Monorepo structure

```
Lantern/                          # pnpm monorepo (pnpm@12.4.2)
├── README.md                     # this file — root navigation
├── AGENTS.md                     # cold-start protocol for AI agents (read first)
├── MEMORY.md                     # living log — current state + decisions + TBD (single truth)
├── GETTING_STARTED.md            # setup, run, test commands for every workspace
├── CONTRIBUTING.md               # (superseded by GETTING_STARTED.md)
├── package.json                  # root workspace scripts
├── pnpm-workspace.yaml           # workspaces: apps/*, packages/*, indexer
├── .env.example                  # root env template (copy to .env, never commit .env)
├── contracts/                    # Foundry (Solidity) — identity + agent-wallet contracts
│   ├── src/                      # AgentRegistry, AgentPassport, Reputation, AgentVault, DemoFXPool, corridor mocks
│   ├── test/                     # Forge tests (90 tests)
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
│   └── package.json
├── apps/web/                     # Next.js 16 (dev :3000, falls back to :3001)
│   ├── src/app/                  # App Router (/agent/[id], /wallet, /network, /docs)
│   ├── src/components/           # molecules: swap-demo-panel, vault-panel, agent-chat-panel
│   └── package.json
├── packages/                     # shared workspace libs
│   ├── config/                   # endpoints, paths, createApiResponse envelope, explorer URLs
│   ├── types/                    # shared TS types (AgentSummary, Attestation, ScoreEvent)
│   ├── utils/                    # shared utilities
│   └── snap/                     # MetaMask Snap (Transaction Insights)
└── indexer/                      # Envio HyperIndex (local Hasura GraphQL :8080)
```

## Quick start

```bash
# 1. Install
pnpm install

# 2. Env (copy templates, never commit real values)
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# 3. Fill .env at minimum:
#    MONAD_TESTNET_RPC_URL          # Monad testnet RPC
#    NEXT_PUBLIC_MONAD_RPC_URL      # browser RPC (apps/web/.env)
#    AGENT_REGISTRY_ADDRESS         # from contracts deployment
#    AGENT_PASSPORT_ADDRESS
#    REPUTATION_ADDRESS
#    DEMO_FX_POOL_ADDRESS
#    AGENT_VAULT_ADDRESS
#    DATA_SOURCE=envio              # optional; live indexer vs mock

# 4. Run
pnpm dev:web   # Next.js (:3000, fallback :3001)
pnpm dev:api   # Express (:4000)
```

## Workspace commands

| Workspace | Install | Dev | Build | Test | Lint |
|-----------|---------|-----|-------|------|------|
| Root | `pnpm install` | `pnpm dev:web` + `pnpm dev:api` | `pnpm build:web` + `pnpm build:api` | — | `pnpm typecheck` |
| contracts | Foundry | — | `forge build` | `forge test` | — |
| apps/api | pnpm | `pnpm dev` | `pnpm build` | `pnpm test` | — |
| apps/web | pnpm | `pnpm dev` | `pnpm build` | `pnpm test` | `pnpm lint` |
| packages/snap | pnpm | `pnpm serve` | — | `pnpm test` | — |
| indexer | pnpm | `pnpm dev` | — | — | — |

Test counts (latest): contracts 90/90, API 85/85, web 36/36, snap 9/9.

## Key env vars

| Var | Where | Purpose |
|-----|-------|---------|
| `MONAD_TESTNET_RPC_URL` | root `.env` | Monad testnet RPC |
| `MONAD_PRIVATE_KEY` | root `.env` | deployer key |
| `NEXT_PUBLIC_MONAD_RPC_URL` | `apps/web/.env` | browser RPC |
| `NEXT_PUBLIC_DEMO_FX_POOL_ADDRESS` | `apps/web/.env` | DemoFXPool address |
| `AGENT_REGISTRY_ADDRESS` / `AGENT_PASSPORT_ADDRESS` / `REPUTATION_ADDRESS` | root `.env` | identity contracts |
| `AGENT_VAULT_ADDRESS` | root `.env` + `apps/web/.env` | AgentVault deposit/withdraw |
| `DATA_SOURCE` | root `.env` + `apps/web/.env` | `envio` = live indexer, else mock |
| `ENVIO_GRAPHQL_URL` | root `.env` | Hasura GraphQL |
| `OPENAI_API_KEY` / `CHAT_MODEL` / `CHAT_MODEL_FALLBACKS` | root `.env` | OpenRouter chat |

## Architecture notes

**2-wallet agent wallet** (`swap-demo-panel.tsx`):
- **Agent wallet** — separate permanent key (`localStorage`, never regenerated → funds never lost). Auto-signs all swaps via `viem` `createWalletClient`; MetaMask is **never** prompted per trade.
- **User wallet (MetaMask)** — funds the agent wallet (send MON to agent address) and can **withdraw** anytime (agent auto-sends MON back, keeping a gas reserve).
- Funds live in the agent wallet directly; `DemoFXPool.sol` is swap-only (no pool credit/parking).

**Lumen Score v1** (`apps/api/src/repositories/scoring.ts`):
- `score = 100 × accuracy × trackRecord`, accuracy recency-weighted (30-day half-life), trackRecord = min(n, 50)/50.
- Computed off-chain on read (lazy, zero gas until a new attestation lands). Gas proof: lazy 153,092 gas vs eager 2,720,429 (17.8×).

## Cold-start protocol (for agents / new contributors)

Read, in order:
1. Root `AGENTS.md` — hard rules + conventions
2. `MEMORY.md` §Current state — what exists NOW (wins over docs on conflict)
3. **One** layer doc from `docs/00`–`05` or `08`–`09`, depending on your task

Never invent contract addresses, URLs, scores, or tx hashes — mark `TBD` instead. Docs + code change in the same commit.

## Dead code (never build on)

- `apps/web/src/containers/home|experience|lantern`
- `apps/web/styles/globals.scss` (removed)
