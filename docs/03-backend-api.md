# 03 — Backend API

> Owner: backend buddy. **First slice landed 2026-10-02** (structure + 4 read endpoints + tests).

## Today (after first slice — verified)

* `express@5.2.1` + `cors + dotenv`, ESM (`type: module`), `tsx watch` dev, `tsc → dist/` build.
* Structure: `src/app.ts` (testable `createApp()`, no listen) · `src/index.ts` (listen only, `PORT`) · `src/routes/agents.ts` · `src/repositories/agentRepository.ts` (interface + active-source selection) · `src/data/mockAgents.ts` (**quarantined fictional data**, docs/06).
* `cors({ origin: "http://localhost:3000" })` still hardcoded (env-driven TODO before leaving localhost). `express.json()` only. 404 + central error middleware added (envelope-shaped).
* Endpoints live: `GET /`, `GET /api/hello`, plus the four below. `POST /api/agents/register` **skipped** (operator-gating TBD).
* Envelope: `createApiResponse` / `createApiErrorResponse` from `packages/utils`. `API_ENDPOINTS` in `packages/config` holds all paths.
* Tests: `node --import tsx --test "src/**/*.test.ts"` (`pnpm --filter @lantern/api test`), app spun on port 0 — 15 tests green. The old `exit 1` stub is gone.
* No auth, logging middleware, rate-limit, DB, or Envio wiring yet.

## Types (landed in `packages/types/src/index.ts`)

```
RiskLevel            = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
AgentSummary { agentId, name, passportTokenId?, owner, score?, risk, executions, failures, updatedAt }
AgentProfile extends AgentSummary { identityUri, passportUri?, attestations: Attestation[] }
Attestation { tokenId, agentId, actionType (STAKE/UNSTAKE/HARVEST/SWAP), result (SUCCESS/FAIL),
              protocol?, amount?, uri?, timestamp }
RiskReport { agentId, score?, risk, reasons[] }
```

Decisions taken while landing (flag if you disagree):

* `score?` omitted everywhere — formula TBD, UI `formatScore` → `N/A`. Mock API also never invents one.
* `passportTokenId?` / `passportUri?` optional — passport mint is separate from registration.
* `amount` is a **decimal string** (uint256 precision), `timestamp`/`updatedAt` are **unix seconds**.
* Mock data carries placeholder `risk` values (clearly labeled) so the response shape is testable.

## Endpoints (live, mock-backed)

```
GET  /api/agents                  → PaginatedResponse<AgentSummary>   (page/limit query, max limit 100)
GET  /api/agents/:id              → ApiResponse<AgentProfile>         (400 malformed id, 404 unknown)
GET  /api/agents/:id/attestations → PaginatedResponse<Attestation>    (newest first)
GET  /api/agents/:id/risk         → ApiResponse<RiskReport>           (for Snap; fast, cacheable)
```

Errors: `{ success:false, message, code? }` with `code = INVALID_AGENT_ID | NOT_FOUND | INTERNAL_ERROR`.

## Envio consumption

* Backend (or frontend directly — decide once) queries Envio HyperIndex GraphQL.
* Backend owns: caching, score/risk derivation, Snap-facing `risk` endpoint latency.
* Env needed (all TBD): `ENVIO_GRAPHQL_URL`, `MONAD_RPC_URL`, `CHAIN_ID`, contract addresses.
* Never commit `.env`. Provide `.env.example` updates with each new var.

## Rules

* One router per resource once file grows past ~100 lines (currently only `routes/agents.ts`).
* Validate inputs, add request logging before any public deploy (error middleware already landed).
* CORS allowlist must become env-driven, not hardcoded, before Snap/web leave localhost.
* Every new endpoint: type in `packages/types` + constructor via `packages/utils` + test.
