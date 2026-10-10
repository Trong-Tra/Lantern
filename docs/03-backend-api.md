# 03 — Backend API

> Owner: backend buddy. **First slice landed 2026-10-02** (structure + 4 read endpoints + tests). **Chat brains landed 2026-10-07**: `POST /api/agents/:id/chat` via OpenRouter (see "Chat brains" section below; 29 tests).

## Today (after first slice — verified)

* `express@5.2.1` + `cors + dotenv`, ESM (`type: module`), `tsx watch` dev, `tsc → dist/` build.
* Structure: `src/app.ts` (testable `createApp(options?)`, no listen) · `src/index.ts` (listen + loads **repo-root `.env`** explicitly, since pnpm runs from `apps/api`) · `src/routes/agents.ts` (factory + injected chat) · `src/repositories/agentRepository.ts` (interface + active-source selection) · `src/services/openRouterChat.ts` (LLM personas) · `src/data/mockAgents.ts` (**quarantined fictional data**, docs/06).
* `cors({ origin: "http://localhost:3000" })` still hardcoded (env-driven TODO before leaving localhost). `express.json()` only. 404 + central error middleware added (envelope-shaped).
* Endpoints live: `GET /`, `GET /api/hello`, plus the four below. `POST /api/agents/register` **skipped** (operator-gating TBD).
* Envelope: `createApiResponse` / `createApiErrorResponse` from `packages/utils`. `API_ENDPOINTS` in `packages/config` holds all paths.
* Tests: `node --import tsx --test "src/**/*.test.ts"` (`pnpm --filter @lantern/api test`), app spun on port 0 — 29 tests green (route + service unit tests, all fetchers faked). The old `exit 1` stub is gone.
* No auth, logging middleware, rate-limit, DB, or Envio wiring yet.

## Types (landed in `packages/types/src/index.ts`)

```
RiskLevel            = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
AgentSummary { agentId, name, passportTokenId?, owner, score?, risk, executions, failures, updatedAt }
AgentProfile extends AgentSummary { identityUri, passportUri?, attestations: Attestation[] }
Attestation { tokenId, agentId, actionType (STAKE/UNSTAKE/HARVEST/SWAP), result (SUCCESS/FAIL),
              protocol?, amount?, uri?, timestamp }
RiskReport { agentId, score?, risk, reasons[] }
ChatMessage { role: user|assistant, content } · ChatRequest { message, history? } · ChatReply { reply }
AgentProfile also gained `bio?` (chat persona blurb, mock-only for now)
```

Decisions taken while landing (flag if you disagree):

* `score?` omitted everywhere — formula TBD, UI `formatScore` → `N/A`. Mock API also never invents one.
* `passportTokenId?` / `passportUri?` optional — passport mint is separate from registration.
* `amount` is a **decimal string** (uint256 precision), `timestamp`/`updatedAt` are **unix seconds**.
* Mock data carries placeholder `risk` values (clearly labeled) so the response shape is testable.

## Endpoints (live, mock-backed)

```
GET  /api/agents/lookup/:address  → ApiResponse<AgentSummary | null>  (Snap: address→agent; 400 INVALID_ADDRESS; null = no match)
GET  /api/agents                  → PaginatedResponse<AgentSummary>   (page/limit query, max limit 100)
GET  /api/agents/:id              → ApiResponse<AgentProfile>         (400 malformed id, 404 unknown)
GET  /api/agents/:id/attestations → PaginatedResponse<Attestation>    (newest first)
GET  /api/agents/:id/risk         → ApiResponse<RiskReport>           (for Snap; fast, cacheable)
POST /api/agents/:id/chat         → ApiResponse<ChatReply>            (LLM persona; see below)
```

Errors: `{ success:false, message, code? }` with `code = INVALID_AGENT_ID | INVALID_ADDRESS | INVALID_MESSAGE | NOT_FOUND | OPENROUTER_NOT_CONFIGURED | CHAT_UPSTREAM_ERROR | INTERNAL_ERROR`.

## Chat brains (OpenRouter — landed 2026-10-07)

* `services/openRouterChat.ts` — persona = system prompt built from the agent's profile (`bio` + on-record stats), model = `CHAT_MODEL` (default `openrouter/free`), 300 max tokens, 15s timeout, **1 bounded retry** (free-tier routing occasionally returns an empty message).
* Key rules: `OPENROUTER_API_KEY` **server-side only** (never in `NEXT_PUBLIC_*`, never logged); missing key → 503 `OPENROUTER_NOT_CONFIGURED`, provider failure → 502 `CHAT_UPSTREAM_ERROR`.
* Env lives in the **repo-root `.env`** (gitignored; keys documented in `.env.example`). `apps/api/src/index.ts` loads package-local `.env` first, then repo-root.
* `AgentProfile.bio?` is the persona blurb (mock-only for now; live data TBD).
* Verified live: two real free-tier calls returned in-character replies. No auth/rate-limit on this endpoint yet — **add before any public deploy**.

## Score/risk formula — v0 LANDED (owner-approved 2026-10-10); score still TBD

Location: **option B — API-side** (this doc's recommendation). v0 banding in `deriveRiskV0` (envioAgentRepository.ts), deterministic + stated in `reasons[]`:

* `<10 executions → UNKNOWN` ("too early to judge").
* else banded by failure rate: `<5% LOW`, `<15% MEDIUM`, else `HIGH`.
* `score` (0–100) remains omitted everywhere — weighted/recency formula still owner-TBD; UI shows `N/A`.

Historical options memo (kept for context):

| Option | Where | Pros | Cons |
| --- | --- | --- | --- |
| A. Indexer-side | Envio handler writes `score`/`risk` onto the agent entity | one source, GraphQL-ready, cheapest reads | every formula change = handler redeploy (maybe reindex) |
| **B. API-side (recommended)** | `apps/api` derives from attestation feed, cached | matches this doc's "backend owns score/risk derivation"; iterate fast, formula versionable, no reindex; Snap endpoint stays fast via cache | needs caching layer (already planned) |
| C. On-chain | contract stores running score | trustless | gas per action, rigid, contradicts `docs/02` "keep contract append-only" |

Formula sketch for B (**all thresholds TBD — owner to approve before coding**):

* `score` 0–100 = weighted success rate over executions with recency decay + minimum-volume damping (few executions → pulls toward neutral, not 100).
* `risk`: `UNKNOWN` below a minimum execution count (cold start); else banded by failure rate (bands + thresholds TBD: LOW/MEDIUM/HIGH).
* `reasons[]` = deterministic contributors ("4 failures in 128 executions") so the Snap panel can explain the band.
* While undecided: API omits `score` (UI → `N/A`), mock returns placeholder `risk` only. **Owner picks A/B/C + thresholds → then code.**

## Envio consumption (LANDED 2026-10-10)

* `repositories/envioAgentRepository.ts` queries the indexer Hasura GraphQL and implements the full `AgentRepository` interface. `DATA_SOURCE=envio` selects it in `agentRepository.ts` (single selection point; default stays `mock` for tests/offline).
* Env: `ENVIO_GRAPHQL_URL` (falls back to local `http://localhost:8080/v1/graphql` — empty value counts as unset), `ENVIO_ADMIN_SECRET` (falls back to local Hasura `testing`; empty on Envio Cloud's public endpoint).
* Mapping notes: names are derived from the on-chain URI slug (`demo://lantern/yield-keeper` → "Yield Keeper") until off-chain metadata lands; `Attestation.txHash` comes from the indexer and renders as an explorer link in the UI; `bio` stays mock-only.
* Never commit `.env`. Provide `.env.example` updates with each new var.

## Rules

* One router per resource once file grows past ~100 lines (currently only `routes/agents.ts`).
* Validate inputs, add request logging before any public deploy (error middleware already landed).
* CORS allowlist must become env-driven, not hardcoded, before Snap/web leave localhost.
* Every new endpoint: type in `packages/types` + constructor via `packages/utils` + test.
