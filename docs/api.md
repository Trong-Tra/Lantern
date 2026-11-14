# 03 — Backend API

> **Backend layer detail. Current state: `MEMORY.md` §Current state (wins on conflict).** Pruned 2026-11-14: chat personas, Lumen score, risk banding, Snap lookup, and the mock data source are gone (git history).

## Today (verified)

* `express@5` + `cors + dotenv`, ESM (`type: module`), `tsx watch` dev, `tsc → dist/` build.
* Structure: `src/app.ts` (testable `createApp(options?)`, no listen; repository injectable) · `src/index.ts` (listen + loads **repo-root `.env`** first via `loadEnv.ts`) · `src/routes/agents.ts` · `src/repositories/agentRepository.ts` (interface + singleton) · `src/repositories/envioAgentRepository.ts` (the only data source).
* `cors({ origin: "http://localhost:3000" })` still hardcoded (env-driven TODO before leaving localhost). `express.json()` only. 404 + central error middleware (envelope-shaped).
* Envelope: `createApiResponse` / `createApiErrorResponse` from `packages/utils`. `API_ENDPOINTS` in `packages/config` holds all paths.
* Tests: `node --import tsx --test "src/**/*.test.ts"` (`pnpm --filter @lantern/api test`), app spun on port 0 with a fake repository — 18 tests green.
* No auth, logging middleware, rate-limit, or DB yet.

## Types (`packages/types/src/index.ts`)

```
AgentSummary { agentId, name, owner, executions, failures, updatedAt }
AgentProfile extends AgentSummary { identityUri, attestations: Attestation[] }
Attestation { tokenId, agentId, actionType (STAKE/UNSTAKE/HARVEST/SWAP), result (SUCCESS/FAIL),
              protocol?, amount?, uri?, txHash?, timestamp }
```

Decisions:

* **No derived score/risk anywhere.** Summaries carry raw attestation counts only. In the arena, standing comes from attested execution outcomes, not a formula. (The old Lumen score/risk v0 were deleted with the pivot.)
* `amount` is a **decimal string** (uint256 precision); `timestamp`/`updatedAt` are **unix seconds**.

## Endpoints (live)

```
GET  /                          → ApiResponse<{ status }>           (health)
GET  /api/hello                 → ApiResponse<{ greeting }>
GET  /api/agents                → PaginatedResponse<AgentSummary>   (page/limit query, max limit 100)
GET  /api/agents/:id            → ApiResponse<AgentProfile>         (400 malformed id, 404 unknown)
GET  /api/agents/:id/attestations → PaginatedResponse<Attestation>  (newest first)
```

Errors: `{ success:false, message, code? }` with `code = INVALID_AGENT_ID | NOT_FOUND | INTERNAL_ERROR`.

## Envio consumption

* `repositories/envioAgentRepository.ts` queries the indexer Hasura GraphQL and implements the full `AgentRepository` interface. It is the **only** source (the quarantined mock was deleted in the pivot).
* Env: `ENVIO_GRAPHQL_URL` (falls back to local `http://localhost:8080/v1/graphql` — empty value counts as unset), `ENVIO_ADMIN_SECRET` (falls back to local Hasura `testing`; empty on Envio Cloud's public endpoint).
* Mapping notes: display names derive from the on-chain URI slug (`demo://lantern/route-runner` → "Route Runner") until off-chain metadata lands; `Attestation.txHash` comes from the indexer.
* Never commit `.env`. Provide `.env.example` updates with each new var.

## Next (arena — TBD, not built)

* Pool-graph serving (assets/pools snapshots), quote-intent intake, solution submission endpoints, solver auth. Design open — see `docs/architecture.md` and MEMORY §TBD.

## Rules

* One router per resource once a file grows past ~100 lines.
* Validate inputs; add request logging + env-driven CORS before any public deploy.
* Every new endpoint: type in `packages/types` + envelope via `packages/utils` + test.
