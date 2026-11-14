# Lantern Graph + Market — build plan (Go backend + market contracts)

> **Target design for pivot 3.** Decisions locked with owner 2026-11-14 (see MEMORY §Decisions). Current state stays in MEMORY §Current state — MEMORY wins on conflict.
> Naming: NOT "arena". **Lantern Graph** = the x402-paid live pool-graph feed solvers buy. **Lantern Market** = the streaming-quote market where users pick the route they like.

## Concept

Two product planes on **Avalanche Fuji testnet**:

* **Lantern Graph** — we build and maintain the pool graph (assets = nodes, pools = edges) against live chain state. Solver agents **buy access via x402** instead of paying their own indexing/compute cost: paying Lantern is cheaper than rebuilding the graph. This is the data business.
* **Lantern Market** — a user posts a swap intent; solvers on the graph compute route sets **plus split allocations** (which pools, which protocols, what fraction of the funds each) and reply with **signed quotes**. Quotes **stream in one by one** — every solver's algorithm and latency differs, so the user watches offers arrive in real time and picks whichever they like best. Quotes carry a **deadline** and solvers can **retract** them as pools shift; an unpicked quote simply dies.

No central algorithm is crowned — the market decides, one user pick at a time, and every settled trade mints an ERC-5192 attestation: standing is earned by being picked and executing, never claimed.

v1 scope decisions (owner, 2026-11-14):

* **Chain**: **Avalanche — Fuji testnet (chain 43113) first**, C-Chain mainnet later. Full move: the identity stack (AgentRegistry + Reputation) redeploys to Fuji; the Monad testnet deployment is legacy. Envio HyperSync supports Fuji natively (`https://fuji.hypersync.xyz`).
* **Pool source**: our own demo pools (controlled reserves, reproducible demos). Adapters for real DEXs (e.g. Avalanche Uni-v2 forks) slot in later behind the same ingestion interface.
* **Settlement**: on-chain, **user-picked quote only** — no on-chain submission window, no contract-side "best" selection. Solutions live off-chain as signed quotes until picked.
* **Solvers**: one reference solver inside the Go service, but the quote protocol (signatures, deadlines, retraction) is designed for external solvers from day one.

## Components

```
contracts/src/                 services/market/ (Go)            indexer/
┌──────────────┐    events   ┌────────────────────────┐  sub  ┌──────────────┐
│ DemoPool ×N  │────────────▶│ ingest → graph store   │◀──────│ Envio        │
│ LanternMarket│   (Envio)   │  └▶ Lantern Graph feed │  WS   │ (pools+market│
│ Registry/    │             │  (x402-gated, solvers) │       │  in config)  │
│ Reputation   │◀────────────│ quote protocol (WS):   │       └──────────────┘
└──────────────┘  execute    │  intent → quotes →     │
   picked quote              │  retract / pick        │
   + attestation             │ api: gqlgen (web)      │
                             └────────────────────────┘
```

### 1. Contracts (Foundry, `contracts/src/`)

* `MockToken.sol` — one minimal mintable ERC-20 (fresh single implementation; the old corridor mocks are gone).
* `DemoPool.sol` — constant-product pair pool: `swap(tokenIn, amountIn)`, `getReserves()`, events `Swap` + `Sync(reserve0, reserve1)`. Multiple pools per pair at varied liquidity so route/slice choice actually matters (TBD: exact token set + pool count; proposal: 5 tokens, 8–10 pools).
* `LanternMarket.sol` — settlement for **picked** quotes:
  * `executeSwap(quote, solverSignature)` — the quote encodes: intent (tokenIn/tokenOut/amountIn), routes + allocation bps, `quotedOut`, `deadline`, `nonce`, `agentId`.
  * Verifies: signature by the owner of a **registered ERC-8004 agent** (`AgentRegistry.ownerOf(agentId)`), deadline not passed, nonce unused.
  * Re-quotes the route set against **current** pool reserves on-chain (constant-product math is cheap at demo scale); reverts if output < `minOut` (quote went stale between pick and execution).
  * Executes the route set atomically, takes the fee to the solver's agent owner, mints the attestation via `Reputation` (market contract is an authorized executor).
  * TBD (owner): fee bps (proposal: 10–30), quote TTL (proposal: ~30–60s / N blocks), who submits `executeSwap` (proposal v1: the user's wallet submits; keeper relay later), failure accounting (reverted/expired quotes mint nothing — track record = settled trades only, flag if you want FAIL attestations).
* Tests per contract, then deploy + seed pools; extend `script/`. Attestation `ActionType` reuses `SWAP` for v1 (enum rework deferred — MEMORY §TBD).

### 2. Indexer (Envio)

* Add `DemoPool` (`Swap`, `Sync`) + `LanternMarket` (`TradeSettled`) to `indexer/config.yaml`; entities `Pool` (current reserves), `Trade`.
* The Go service consumes state via **Hasura GraphQL subscriptions (WS)** — no custom indexing code.

### 3. Go service (`services/market/`)

New top-level dir; **Go module, not a pnpm workspace member** (separate toolchain). Go 1.23+.

```
services/market/
├── go.mod
├── cmd/market/main.go       # entrypoint: config, wiring, graceful shutdown
├── internal/
│   ├── config/              # env loading (same root .env; keys in .env.example)
│   ├── ingest/              # Envio WS subscriptions → domain events
│   ├── graph/               # pool graph: token nodes, pool edges, reserve store
│   ├── graphfeed/           # Lantern Graph: snapshot + per-block diffs, x402-gated
│   ├── solver/              # reference solver: route search + split allocation
│   ├── protocol/            # quote WS: intent broadcast, signed quotes, retract, pick
│   ├── paywall/             # x402 middleware (402 challenge, payment verify, access grants)
│   ├── chain/               # abigen bindings, quote verification helpers, tx submission
│   └── api/                 # gqlgen GraphQL (web-facing queries)
└── README.md
```

Key choices:

* **Bindings**: `go-ethereum` + `abigen` from Foundry artifacts (`contracts/out`).
* **Solver transport = raw WebSocket** (`coder/websocket` or `gorilla/websocket`): per-block graph diffs and quote streams are machine traffic — no GraphQL overhead. **GraphQL (gqlgen) is for the web app only.**
* **x402 paywall**: graph feed endpoints issue 402 challenges; payment verified before the WS upgrades / snapshots serve. Facilitator + exact rail on Fuji: **TBD — verify x402 Avalanche support before Phase 3**, fallback is a minimal 402 flow with direct payment-tx verification.
* **Quote auth**: quotes signed with the agent owner's key; service verifies `ecrecover` + registry ownership. No accounts, no passwords.
* **Reference solver** (v1, iterate later): depth-capped DFS over the graph (max 3–4 hops), split allocation by grid search over slice percentages (e.g. 1–5% steps), scored by simulated output after price impact. Also the **sanity baseline** quotes are compared against before being shown.
* **Quote lifecycle**: `IntentOpened` (WS) → solvers stream `Quote` messages → solver may send `Retract` (pools moved) → user's `Pick` → `executeSwap` on-chain → `TradeSettled` → attestation. Stale quotes (deadline passed) are dropped client- and contract-side.

### 4. Types boundary

`packages/types` stays the TS source of truth for the frozen frontend era. New market types (Intent, Quote, PoolSnapshot, Trade) are defined **once in the GraphQL schema** (`services/market/internal/api/schema.graphqls`); TS types get generated from it when the frontend rebuilds. No hand-maintained duplicate shapes.

### 5. Chain migration notes (Phase 0, with the Fuji redeploy)

* Env rename across `.env.example` / scripts / indexer / Go config: `MONAD_TESTNET_RPC_URL` → `AVAX_FUJI_RPC_URL`; key names stay (`MONAD_PRIVATE_KEY` → `DEPLOYER_PRIVATE_KEY` at the same time).
* `packages/config`: explorer URLs move to Snowtrace testnet (`https://testnet.snowtrace.io`).
* Indexer `config.yaml`: chain id `10143` → `43113`; addresses come from the Fuji redeploy (TBD until executed — owner needs Fuji AVAX from the faucet).
* The Monad testnet deployment (Registry `0x62cd4e0C…a6341`, Reputation `0xb5A7CEB3…b72f8` + 15 seeded agents) stays readable as legacy data but receives no new development.

## Phases (each independently verifiable)

| Phase | Deliverable | Verify |
| --- | --- | --- |
| 0 — chain move + contracts | Redeploy identity stack (AgentRegistry + Reputation) on **Fuji (43113)**; `MockToken`, `DemoPool`, `LanternMarket` + tests, deploy scripts, seeded pools; indexer re-pointed at Fuji and extended | `forge test`; entities visible in Hasura |
| 1 — Go skeleton | module, config, Envio subscription ingest, in-memory graph store that tracks reserves live | `go test ./...`; log line per block showing graph consistency vs on-chain reserves |
| 2 — quote flow e2e | intent → reference solver quotes → pick → `executeSwap` settles → attestation minted | scripted demo flow; attestation visible via API/indexer |
| 3 — x402 + protocol hardening | graph feed paywalled; quote signatures/deadlines/retraction enforced; bad-signature + stale-quote rejection tests | integration tests |
| 4 — frontend rebuild | swap UI on the quote stream (separate session — frontend frozen until then) | — |

## Conventions

* Go: standard layout, `gofmt` + `go vet` clean, table-driven tests; no framework beyond what's listed.
* Env keys: documented in `.env.example` as keys only; Go service reads the repo-root `.env` like `apps/api` does.
* Same repo rules: TBD > invented values, docs + code in the same commit, `forge test`/`go test` green per touched area.
