# Lantern

**Lantern Graph + Market** on Avalanche (Fuji testnet first).

Every aggregator searches the same kind of pool graph (assets = nodes, pools = edges) — but no single routing algorithm wins always, and the best **split allocation** across routes depends on swap size, graph topology, and pool state at that moment. Lantern builds and maintains that graph (**Lantern Graph**, x402-paid feed for solvers), then lets a network of solver agents — each with a verifiable **ERC-8004 identity** — stream signed quotes onto it (**Lantern Market**). The user picks the quote they like; only that route settles on-chain, its solver earns the fee, and every settlement is written to a soulbound **ERC-5192** track record: reputation is earned by being picked and executing, never claimed.

> Status: mid-rebuild (pivot 2026-11-14). The identity stack, indexer, API read layer, market contracts (undeployed), and the Go market-service skeleton exist; the quote protocol, x402 paywall, and new swap UI are not built yet (plan: `docs/market.md`). The pre-pivot frontend is frozen in place (see `MEMORY.md`).

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
├── services/market/             # Go market service (own module — Phase 1 skeleton: ingest + graph store)
└── indexer/                      # Envio HyperIndex (local Hasura GraphQL :8080)
```

## Deployed contracts — Avalanche Fuji (chain 43113)

Deployed 2026-11-15 by `0x7EA634e331CF7b503df2e224f77a7C589462F1F2` (`Deploy.s.sol` → `DeployMarket.s.sol` → `SeedAgents.s.sol`):

| Contract | Address |
| --- | --- |
| AgentRegistry | `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341` |
| Reputation | `0x5Df5E5FD5396e1387A982a7A7450D0c7CEaB40B8` |
| LanternMarket | `0xE77719De4D0921110DDcFb3497415Efd6F29f70B` |
| MockTokens (5) | mUSDC `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8`, mUSDT `0x173C86c27Ea43BB541b84E72076B8CA7Ff5b1e41`, mWAVAX `0x6Eb204b09A36547fE21833744c8C9cC802C19B04`, mWETH `0x1e38cf69DA98506F14D43C82a3ca8Aa825ac8aF7`, mWBTC `0x1638ac963dA5d466d928289852c047A9d2ad7047` |
| DemoPools (9) | `0xFB9D4e5d3F4f8b089739B9D2f03e21d37f87e536`, `0x49BF5bc89639b46CFe5B2eFA716BB187f253a47E`, `0x27E4967EB9e09efaD6809914874159C771b51cAc`, `0x2300Ae9042ADaF68C4C8B80FAB6e19A9249d5ca0`, `0xC82B5A7Fbc0535346C994Dd8D6d47983690B7360`, `0x4B581d01AFF9D688384F507208e56f70f71B1838`, `0x8937E9037A7Ad5d323236C7E11AE9dB0d065D982`, `0x3997d6a7B3b31EbDF39433a20a4D4eFc86c68Ca5`, `0x82DbcDa614D0b3475c64e65088cA7b73228b09e0` |

15 seed agents registered (ids 1–15, owner = deployer). Addresses are also in `.env` (gitignored) and `indexer/config.yaml`.

Legacy Monad testnet (chain 10143, read-only): AgentRegistry `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341` (same address as Fuji — same deployer nonce), Reputation `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8`, deployer `0x7EA634e331CF7b503df2e224f77a7C589462F1F2`. (Old-concept deployments — Passport, Vault, DemoFX — still exist on Monad but are unsupported; code removed 2026-11-14.)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Env (copy template, never commit real values)
cp .env.example .env

# 3. Fill .env at minimum:
#    AVAX_FUJI_RPC_URL              # Avalanche Fuji RPC
#    AGENT_REGISTRY_ADDRESS         # from the Fuji redeploy (pending)
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
