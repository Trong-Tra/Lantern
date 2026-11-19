# Lantern Finance Graph + Market — build plan (Go backend + market contracts)

> **Target design for pivot 3.** Decisions locked with owner 2026-11-14 (see MEMORY §Decisions). Current state stays in MEMORY §Current state — MEMORY wins on conflict.
> Naming: NOT "arena". **Lantern Finance Graph** = the x402-paid live pool-graph feed solvers buy. **Lantern Finance Market** = the streaming-quote market where users pick the route they like.

## Concept

Two product planes on **Avalanche Fuji testnet**:

* **Lantern Finance Graph** — we build and maintain the pool graph (assets = nodes, pools = edges) against live chain state. Solver agents **buy access via x402** instead of paying their own indexing/compute cost: paying Lantern Finance is cheaper than rebuilding the graph. This is the data business.
* **Lantern Finance Market** — a user posts a swap intent; solvers on the graph compute route sets **plus split allocations** (which pools, which protocols, what fraction of the funds each) and reply with **signed quotes**. Quotes **stream in one by one** — every solver's algorithm and latency differs, so the user watches offers arrive in real time and picks whichever they like best. Quotes carry a **deadline** and solvers can **retract** them as pools shift; an unpicked quote simply dies.

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
│ LanternMarket│   (Envio)   │  └▶ Lantern Finance Graph feed │  WS   │ (pools+market│
│ Registry/    │             │  (x402-gated, solvers) │       │  in config)  │
│ Reputation   │◀────────────│ quote protocol (WS):   │       └──────────────┘
└──────────────┘  execute    │  intent → quotes →     │
   picked quote              │  retract / pick        │
   + attestation             │ api: gqlgen (web)      │
                             └────────────────────────┘
```

### 1. Contracts (Foundry, `contracts/src/`)

* `MockToken.sol` — one minimal mintable ERC-20 (fresh single implementation; the old corridor mocks are gone).
* `DemoPool.sol` — constant-product pair pool: `swap(tokenIn, amountIn)`, `getReserves()`, `getAmountOut()`, owner-only `seed()` (mints land in the pool, `seed()` adopts balances as reserves). 30 bps pool fee. Events `Swap` + `Sync(reserve0, reserve1)` (Sync fires on seed and every swap — the reserve source of truth). Multiple pools per pair at varied liquidity so route/slice choice actually matters — topology locked 2026-11-14: **5 tokens, 9 pools** (`script/seed/market.json`).
* `LanternMarket.sol` — settlement for **picked** quotes:
  * `executeSwap(quote, solverSignature)` — the quote encodes: intent (tokenIn/tokenOut/amountIn), routes + allocation bps, `quotedOut`, `deadline`, `nonce`, `agentId`.
  * Verifies: EIP-191 signature by the owner of a **registered ERC-8004 agent** (`AgentRegistry.ownerOf(agentId)`), deadline not passed, nonce unused, caller = `quote.user`.
  * Re-quotes the route set against **current** pool reserves on-chain (constant-product math is cheap at demo scale); reverts if output < `minOut` (quote went stale between pick and execution).
  * Executes the route set atomically, takes the fee to the solver's agent owner, mints the attestation via `Reputation` (market contract is an authorized executor).
  * **Locked (owner, 2026-11-14): fee 20 bps; quote TTL ~45s (off-chain guidance — contract enforces only `deadline`); v1 submitter = the user's wallet (keeper relay later); failure accounting: reverted/expired quotes mint nothing — track record = settled trades only.**
* Tests per contract, then deploy + seed pools; `script/DeployMarket.s.sol` deploys tokens + pools + market from `script/seed/market.json`. Attestation `ActionType` reuses `SWAP` for v1 (enum rework deferred — MEMORY §TBD).

### 2. Indexer (Envio)

* Add `DemoPool` (`Sync` — reserve source of truth, fires on seed + every swap; `Swap` deliberately unindexed until volume analytics need it) + `LanternMarket` (`TradeSettled`) to `indexer/config.yaml`; entities `Pool` (current reserves), `Trade`. Done 2026-11-14 with zero-address placeholders pending the Fuji redeploy.
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
│   ├── graphfeed/           # Lantern Finance Graph: GET /graph/snapshot (JSON), x402-gated (per-block diffs later)
│   ├── marketdata/          # Phase 4 display feed: Hyperliquid prices/candles + polled real-DEX graph → GET /market/*
│   ├── solver/              # reference solver: route search + split allocation + runner (intent → sign → submit)
│   ├── protocol/            # quote WS (ws.go): intent broadcast, signed quotes, retract, pick; hub.go = lifecycle
│   ├── paywall/             # x402 middleware (402 challenge, facilitator /settle, PAYMENT-RESPONSE)
│   ├── chain/               # abigen bindings, quote verification helpers, tx submission
│   └── api/                 # gqlgen GraphQL (web-facing queries incl. identity reads; apps/api removed 2026-11-15 — FE targets this, not Express)
├── marketdata.json          # Phase 4 feed config (coins/chains/pairs; data, not secrets; MARKETDATA_FILE overrides path)
└── README.md
```

Key choices:

* **Bindings**: `go-ethereum` + `abigen` from Foundry artifacts (`contracts/out`).
* **Solver transport = raw WebSocket** (`coder/websocket` or `gorilla/websocket`): per-block graph diffs and quote streams are machine traffic — no GraphQL overhead. **GraphQL (gqlgen) is for the web app only.**
* **x402 paywall**: `GET /graph/snapshot` issues a v2 402 challenge (`PAYMENT-REQUIRED` header + JSON body, base64) and settles each `PAYMENT-SIGNATURE` through the **PayAI facilitator** (`https://facilitator.payai.network` — supports `avalanche-fuji` exact, verified live via `GET /supported` and the Fuji echo route) before serving; settle-only (settle subsumes verify, idempotent per payload). Terms from config: `X402_ASSET` (USDC Fuji `0x542589…1Bc65`), `X402_PAY_TO`, `X402_AMOUNT` (base units) — all three or the feed serves open. CORS preflight passes unpaid.
* **Quote auth**: quotes signed with the agent owner's key; service verifies `ecrecover` + registry ownership. No accounts, no passwords.
* **Reference solver** (v1, iterate later): depth-capped DFS over the graph (max 3–4 hops), split allocation by grid search over slice percentages (e.g. 1–5% steps), scored by simulated output after price impact. Also the **sanity baseline** quotes are compared against before being shown.
* **Quote lifecycle**: `IntentOpened` (WS) → solvers stream `Quote` messages → solver may send `Retract` (pools moved) → user's `Pick` → `executeSwap` on-chain → `TradeSettled` → attestation. Stale quotes (deadline passed) are dropped client- and contract-side.

**Chart timeframes — one native Hyperliquid candle per button.** The `/exchange` buttons are **candle sizes**, not window lengths: `5m` = 5-minute bars, `1H` = 1-hour bars, `1D`/`1W`/`1M` likewise (`1M` = monthly). Nothing is aggregated, synthesized or rebucketed — each chart shows N closed bars plus the bar currently forming, and that last bar is what moves between updates.

| Button | HL interval | Bars served | Forming bar |
| --- | --- | --- | --- |
| 5m | `5m` | 73 (72 closed + 1) | yes — a 5-minute candle |
| 1H | `1h` | 73 | yes |
| 1D | `1d` | 73 | yes |
| 1W | `1w` | 25 | yes |
| 1M | `1M` | 13 | yes |

* Backend source of truth: `candleSpecs` in `internal/marketdata/service.go`. Boot `candleSnapshot` covers `bars × interval` (span from `candleSpan`), then one WS `candle` subscription per interval per coin keeps the forming bar live. HL has no sub-minute interval and none is needed — do not build synthetic candles from `allMids` (mids are throttled and carry no volume).
* FE source of truth: `TIMEFRAMES` in `apps/web/src/app/exchange/chart-data.ts` mirrors the table (`chartIntervalFor` / `chartLimitFor` / `chartRefetchFor`) and polls so the forming bar advances. Adding or changing a timeframe means editing both tables — nowhere else.

**Route breakdown — clicking a solver quote shows how the split is routed.** A quote carries `routes: [{ bps, pools[] }]` (whole-path allocations that sum to 10000; each hop carries its path's full share). The `/exchange` quote row is a disclosure button: opening it renders `QuoteRouteFlow` (`apps/web/src/app/exchange/quote-routes.tsx`) as one line per path — `62.5%` → pool chip (`mUSDC / mWAVAX`, address, `62.5% of input`) → `mWAVAX` → next pool → … — so the user sees what share of the input reaches which pool and where it goes after.

* Logic lives in `apps/web/src/libs/market/routes.ts` (pure, unit-tested in `tests/exchange-routes.test.mjs`): `FUJI_DEMO_POOLS` is the address→pair registry, seeded from `contracts/broadcast/DeployMarket.s.sol/43113/run-latest.json` / `script/seed/market.json` — quotes carry pool addresses only, so regenerating the topology means updating that table and nowhere else.
* Hops are walked from the quote's `tokenIn`; a pool the registry doesn't know, or a pair that doesn't touch the running token, renders `?` with a dashed chip rather than a guessed symbol.

**Chain wiring (web) = Avalanche Fuji.** `providers.tsx` builds the wagmi config for `avalancheFuji` (`libs/chain.ts`, public RPC default, `NEXT_PUBLIC_FUJI_RPC_URL` overrides) and the wallet button asks for Fuji — there is no Monad prompt and no env gate, since the public RPC makes the wallet usable without setup. `monadTestnet` remains exported only for the legacy, known-broken agent-page panels (`vault-panel`, `swap-demo-panel`), which die with that page in the Phase 4 rebuild.

### 4. Types boundary

`packages/types` stays the TS source of truth for the frozen frontend era. New market types (Intent, Quote, PoolSnapshot, Trade) are defined **once in the GraphQL schema** (`services/market/internal/api/schema.graphqls`); TS types get generated from it when the frontend rebuilds. No hand-maintained duplicate shapes.

### 5. Chain migration notes (Phase 0 — code side done 2026-11-14, Fuji redeploy pending)

* Env rename done across `.env.example` / scripts / indexer / docs: `MONAD_TESTNET_RPC_URL` → `AVAX_FUJI_RPC_URL`; `MONAD_PRIVATE_KEY` → `DEPLOYER_PRIVATE_KEY`; `ENVIO_MONAD_RPC_URL` → `ENVIO_AVAX_FUJI_RPC_URL`. (Go service config reads the same keys when built in Phase 1.)
* `packages/config`: explorer URLs moved to Snowtrace testnet (`https://testnet.snowtrace.io`; `getMonadExplorerUrl` → `getExplorerUrl`, `NEXT_PUBLIC_MONAD_EXPLORER_URL` → `NEXT_PUBLIC_EXPLORER_URL`).
* Indexer `config.yaml`: chain id `10143` → `43113` done; addresses are zero-address placeholders until the redeploy (TBD until executed — owner needs Fuji AVAX from the faucet).
* The Monad testnet deployment (Registry `0x62cd4e0C…a6341`, Reputation `0xb5A7CEB3…b72f8` + 15 seeded agents) stays readable as legacy data but receives no new development.

## Phases (each independently verifiable)

| Phase | Deliverable | Verify |
| --- | --- | --- |
| 0 — chain move + contracts | Redeploy identity stack (AgentRegistry + Reputation) on **Fuji (43113)**; `MockToken`, `DemoPool`, `LanternMarket` + tests, deploy scripts, seeded pools; indexer re-pointed at Fuji and extended. **Done 2026-11-15**: deployed + seeded (15 agents, attestations), addresses in `.env` / `indexer/config.yaml` / README; `forge test` 93/93, indexer 7/7 | `forge test`; entities visible in Hasura (after redeploy) |
| 1 — Go skeleton | module, config, Envio subscription ingest, in-memory graph store that tracks reserves live. **Done 2026-11-15** (`go test ./...` green; live Hasura feed still needs `ENVIO_API_TOKEN` / local indexer run) | `go test ./...`; log line per block showing graph consistency vs on-chain reserves |
| 2 — quote flow e2e | intent → reference solver quotes → pick → `executeSwap` settles → attestation minted. **Done 2026-11-15**: off-chain (quote protocol WS, reference solver, digest/sign/verify, `SettleSwap`) + **on-chain e2e passed on live Fuji** — `go run ./cmd/e2e` (from `services/market/`) drives intent → quote → pick → `executeSwap` → verifies `TradeSettled` + SWAP/SUCCESS attestation in the receipt; fee = 20 bps confirmed | `go test ./...`; `go run ./cmd/e2e` → `E2E PASS` |
| 3 — x402 + protocol hardening | graph feed paywalled; quote signatures/deadlines/retraction enforced; bad-signature + stale-quote rejection tests. **Done 2026-11-16**: gqlgen API (`internal/api`), signed retractions + connection-bound pick + WS origin policy (`internal/protocol`), x402 paywall + graph snapshot feed (`internal/paywall`, `internal/graphfeed`); live 402 challenge + open-mode snapshot verified against Fuji data | `go test ./... -race`; live `GET /graph/snapshot` (open + 402) |
| 4 — frontend rebuild + display feed | matcha-style exchange + portfolio on the quote stream; display-only real-market feed (Hyperliquid prices + real DEX graph) behind `GET /market/*`; multi-agent mock solvers signed with the **real** seeded agent identities (deployer owns all 15). **M1 done 2026-11-17**: `internal/marketdata` — HL WS (`allMids` + candle) with `/info` boot (`candleSnapshot`, `metaAndAssetCtxs`), V2 factory poller with boot verification (`getPair`/`symbol`/`decimals`/`token0` on public RPCs; 6 pools: Ethereum WBTC/WETH/USDC + BSC BTCB/WBNB/USDT), config `marketdata.json` (missing file = feed off, service unaffected); live smoke: 4 coins priced, reserves move, candles hour-aligned, WS self-heals hourly resets. **M3+M4 done 2026-11-17**: FE wiring (`packages/config` `MARKET_ENDPOINTS`/`getMarketApiBaseUrl`/`getQuoteWsUrl`, `DEFAULT_API_URL`→`:8082`) + live `/exchange` — Hyperliquid chart/price streaming (react-query polls), quote-WS client (debounced intent → signed solver quotes → slippage filter → Select/pick), Fuji mock-token registry, Advanced tab shows display-only real-DEX pools; mock fixtures deleted. **HL stays display-only** — `internal/marketdata` is imported only by `cmd/market`; the solver routes over Fuji DemoPools exclusively | `go test ./... -race`; web tests 122/122; live `GET /market/prices|graph|candles`; WS intent→quote→pick round-trip |

## Conventions

* Go: standard layout, `gofmt` + `go vet` clean, table-driven tests; no framework beyond what's listed.
* Env keys: documented in `.env.example` as keys only; Go service reads the repo-root `.env`.
* Same repo rules: TBD > invented values, docs + code in the same commit, `forge test`/`go test` green per touched area.
