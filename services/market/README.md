# services/market — Lantern market service (Go)

> Build plan: `docs/market.md` §3. **Phase 1 skeleton** — config, Envio ingest, in-memory graph store, on-chain consistency spot-checks. Solver, quote protocol, x402 paywall, and gqlgen API land in Phases 2–3.

Own Go module (`go 1.23+`), **not** a pnpm workspace member.

## Layout

```
cmd/market/          entrypoint: config, wiring, graceful shutdown
internal/
  config/            env loading (repo-root .env; process env wins)
  ingest/            Envio Hasura GraphQL subscriptions (WS) → graph.Sync
  graph/             pool graph store: token nodes, pool edges, live reserves
  chaincheck/        eth_call getReserves spot-checks (raw JSON-RPC; abigen bindings in Phase 2)
```

## Run

```bash
# from services/market (reads ../../.env; override with MARKET_ENV_PATH)
go run ./cmd/market
```

Requires `AVAX_FUJI_RPC_URL` and a running indexer (`ENVIO_GRAPHQL_URL`, default `http://localhost:8080/v1/graphql`; `ENVIO_ADMIN_SECRET` when set). Live ingest needs the Fuji redeploy done (Phase 0) and `ENVIO_API_TOKEN` for `envio dev`.

Log lines: one per pool update (`block N pool 0x… reserves a/b`) and one consistency line per tracked pool every 30s (`ok` / `MISMATCH` vs on-chain `getReserves()`).

## Test

```bash
go test ./...   # in-memory; ingest tests run against a fake Hasura WS server
go vet ./... && gofmt -l .
```
