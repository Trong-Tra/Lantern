# 07 — Deployment (free tier)

> **Owner call 2026-11-19: $0/mo while the product is a demo.** Sleep is acceptable — the app only needs to work when people visit; WS may die between visits, and the pools are mocks nobody touches. Upgrade when real users arrive.

## The stack (3 deployables, no database)

| Piece | Host | Plan | Behavior |
| --- | --- | --- | --- |
| FE (`apps/web`) | Vercel | Hobby free | Root Directory `apps/web` |
| Go service (`services/market/cmd/market`) | Render | Free compute (0.1 CPU / 512 MB) | spins down after 15 min idle, wakes in ~1 min on the next HTTP request or WS connection; **one public port** |
| Indexer (`indexer/`) | Envio Cloud | free Development plan (no card) | hosted Hasura stays up; **dev deployments are deleted after ≤30 days** — redeploy (Envio Console/CLI) on a calendar reminder. Production from $70/mo |

No Postgres/Neon anywhere: market state is in-memory (it rebuilds on wake — ingest replays from Hasura, the display feed reboots candles in ~40 s), the chain is the source of truth.

## Why one port is enough

`cmd/market` serves `POST|GET /graphql`, `GET /graph/snapshot`, `GET /market/*`, `GET /healthz` **and `WS /quotes`** on a single listener (`API_ADDR`; when unset, the PaaS-injected `PORT` is used — Render/Railway/Cloud Run style). `/quotes` answers **503** until the quote hub is up (or while the contract addresses aren't configured). The dedicated `:8081` listener (`MARKET_WS_ADDR`) stays for the local default URL.

## Vercel (FE)

* Root Directory: `apps/web` · Framework: Next.js (auto-detected)
* Env vars (never commit values):

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<service>.onrender.com` — **origin only**, the client appends `/graphql` |
| `NEXT_PUBLIC_QUOTE_WS_URL` | `wss://<service>.onrender.com/quotes` — full URL incl. path |
| `NEXT_PUBLIC_FUJI_RPC_URL` | `https://api.avax-test.network/ext/bc/C/rpc` (optional — public Fuji default already works) |

## Render (Go service)

New → Web Service → this repo → **Root Directory `services/market`** → Go runtime:

* Build: `go build -o market ./cmd/market`
* Start: `./market`
* Compute plan: **Free** · Health check path: `/healthz`

Env vars (dashboard; `.env` is never deployed — process env wins):

| Key | Notes |
| --- | --- |
| `AVAX_FUJI_RPC_URL` | required (config hard-fails without it) |
| `ENVIO_GRAPHQL_URL` | Envio Cloud Hasura URL (`https` → `wss` derived for ingest) |
| `ENVIO_ADMIN_SECRET` | if the indexer endpoint requires it |
| `AGENT_REGISTRY_ADDRESS`, `LANTERN_MARKET_ADDRESS` | from README / `docs/contracts.md` — also **enable the quote protocol** (without both, `/quotes` stays 503) |
| `WS_ALLOWED_ORIGINS` | `https://<vercel-domain>` — browser quote-WS origin gate (empty = any origin) |
| `REFERENCE_SOLVER_KEY`, `REFERENCE_SOLVER_AGENT_ID` | optional; without them quotes still stream but no solver answers |
| `API_ADDR` | leave unset → `PORT` is used automatically |

Boot log confirms wiring: `dual-registration: 15 agents mapped`, `web API listening on :PORT`, `quote protocol listening on :8081 (and /quotes on the web API port)`.

## Envio Cloud (indexer)

1. `ENVIO_API_TOKEN` (owner secret — not in the repo) deploys `indexer/` (config + handlers) from the Console/CI.
2. Point `ENVIO_GRAPHQL_URL` (+ `ENVIO_ADMIN_SECRET`) at the hosted Hasura URL.
3. **Free dev deployments expire ≤30 days** — redeploy before expiry or `/graphql` goes dark (FE shows the offline state until then). Local alternative for development: `envio dev` at `localhost:8080` (the service defaults already match).

## Wake behavior (why sleep is fine here)

* **First visitor after idle:** the Render request triggers spin-up (~1 min); the FE's react-query retry/refetch recovers, and the quote-WS client reconnects every 3 s.
* **On wake:** ingest re-subscribes and replays pool state from Hasura; the display feed reboots candles (~40 s); the 30 s consistency loop resumes. All proven locally — nothing is lost, the store is a cache of the chain/indexer.
* **Render free limits:** 750 instance-hours/month (spun-down time is free; always-on ≈ 744 h fits if you keep it up), 5 GB outbound bandwidth, ephemeral filesystem, restarts at any time, and a service-initiated-traffic threshold — our profile (persistent WS + 30 s RPC checks) is low-volume.
* Quote WS between visitors: dead while asleep, back after wake — accepted for the demo (mock pools, nothing at stake).

## Local development (unchanged)

```bash
cd indexer && envio dev            # Hasura at :8080 (defaults)
# root .env from .env.example (AVAX_FUJI_RPC_URL, contract addresses, solver keys…)
cd services/market && go run ./cmd/market
pnpm --filter @lantern/web dev     # apps/web → talks to :8082 (API) + :8081 (quote WS)
```

## Upgrade path (when users arrive)

* Render Free → paid ($7+/mo) for always-on, or a small VPS (runs the Go service **and** `envio dev` together — one box, no cloud indexer).
* Envio Cloud dev → production plan ($70/mo) or self-host the indexer on the same box.
* Turn on the x402 paywall (`X402_ASSET`/`X402_PAY_TO`/`X402_AMOUNT`) when the graph feed should charge.
