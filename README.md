# Lantern

A **competitive multihop swap routing arena** on Monad.

Every aggregator searches the same kind of pool graph (assets = nodes, pools = edges) — but no single routing algorithm wins always, and the best **split allocation** across routes depends on swap size, graph topology, and pool state at that moment. Lantern builds the graph and lets a network of solver agents — each with a verifiable **ERC-8004 identity** — compete on every swap intent. The best solution wins the fee, and every outcome is written to a soulbound **ERC-5192** track record: reputation is earned by winning, never claimed.

> Status: mid-rebuild (pivot 2026-11-14). The identity stack, indexer, and API read layer are live; the arena contracts, solver protocol, and new swap UI are not built yet. The pre-pivot frontend is frozen in place (see `MEMORY.md`).

## Monorepo structure

```
Lantern/                          # pnpm monorepo (pnpm@12.4.2)
├── README.md                     # this file — root navigation
├── AGENTS.md                     # cold-start protocol for AI agents (read first)
├── MEMORY.md                     # living log — current state + decisions + TBD
├── GETTING_STARTED.md            # setup, run, test commands for every workspace
├── package.json                  # root workspace scripts
├── pnpm-workspace.yaml           # workspaces: apps/*, packages/*, indexer
├── .env.example                  # root env template (copy to .env, never commit .env)
├── contracts/                    # Foundry (Solidity) — identity stack
│   ├── src/                      # AgentRegistry (ERC-8004), Reputation (ERC-5192), utils/
│   ├── test/                     # Forge tests (53 tests)
│   ├── script/                   # Deploy + SeedAgents + SeedAttestations
│   └── README.md
├── apps/api/                     # Express 5 backend (port 4000)
│   └── src/                      # app.ts, routes/, repositories/ (Envio-backed)
├── apps/web/                     # Next.js 16 — FROZEN pre-pivot (do not touch; rebuild pending)
├── packages/                     # shared workspace libs
│   ├── config/                   # endpoint paths, explorer URLs
│   ├── types/                    # shared TS types (AgentSummary, Attestation)
│   └── utils/                    # envelope + formatting helpers
└── indexer/                      # Envio HyperIndex (local Hasura GraphQL :8080)
```

## Deployed contracts — Monad testnet (chain 10143)

| Contract | Address |
|----------|---------|
| AgentRegistry (ERC-8004) | `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341` |
| Reputation (ERC-5192) | `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8` |

Deployer: `0x7EA634e331CF7b503df2e224f77a7C589462F1F2`. (Old-concept deployments — Passport, Vault, DemoFX — still exist on-chain but are unsupported; code removed 2026-11-14.)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Env (copy template, never commit real values)
cp .env.example .env

# 3. Fill .env at minimum:
#    MONAD_TESTNET_RPC_URL          # Monad testnet RPC
#    AGENT_REGISTRY_ADDRESS         # from the table above
#    REPUTATION_ADDRESS
#    ENVIO_GRAPHQL_URL              # optional; defaults to local :8080

# 4. Run
pnpm dev:api   # Express (:4000)
```

## Workspace commands

| Workspace | Install | Dev | Build | Test |
|-----------|---------|-------|-------|------|
| contracts | Foundry | — | `forge build` | `forge test` |
| apps/api | pnpm | `pnpm dev` | `pnpm build` | `pnpm test` |
| indexer | pnpm | `pnpm dev` (Docker) | — | `pnpm test` |
| apps/web | pnpm | frozen | — | — |

Test counts (latest): contracts 53/53, API 18/18, indexer 4/4.

## Cold-start protocol (for agents / new contributors)

Read, in order:
1. Root `AGENTS.md` — hard rules + conventions
2. `MEMORY.md` §Current state — what exists NOW (wins over docs on conflict)
3. **One** layer doc for your task — map in `AGENTS.md`

Never invent contract addresses, URLs, scores, or tx hashes — mark `TBD` instead. Docs + code change in the same commit.
