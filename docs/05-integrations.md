# 05 — Integrations (Dynamic / MetaMask Snap / Envio / OpenRouter)

## OpenRouter — chat "brains" for identities (LANDED)

* Goal: chat with any ERC-8004 identity from its Explorer profile.
* Status: live in API — `POST /api/agents/:id/chat` → `apps/api/src/services/openRouterChat.ts` (15s timeout, 300 max tokens, last-10 history, bounded retry for `openrouter/free` empty-content flake).
* Env (root `.env`, gitignored; keys listed in `.env.example`): `OPENROUTER_API_KEY`, `CHAT_MODEL` (default `openrouter/free`).
* Constraint: system prompt (`buildSystemPrompt`) forbids inventing chain data — unknown values are TBD/unknown.
* Tests: `openRouterChat.test.ts` (fake fetcher) + chat route cases in `app.test.ts`.

## Dynamic — passkey agent wallets ($5,000 bounty)

* Goal: operator creates a **passkey-native** wallet (P256/WebAuthn), server-side, no seed phrase. Agent's 8004 owner = this wallet.
* Status: missing. Current Connect button is a stub dialog.
* Needed (TBD): `NEXT_PUBLIC_DYNAMIC_ENV_ID`, server template, operator onboarding flow (create → register agent → authorize executor).
* Demo proof: register the reference yield agent from a passkey wallet on stage. No EOAs in the happy path.

## MetaMask Snap — transaction-time verification ($2,500 bounty)

* Goal: intercept txs to agent contracts, show **ERC-8004 ID + soulbound history + risk score** before signing.
* Layer: `packages/snap/` (missing). Type: Transaction Insights Snap.
* Data source: `GET /api/agents/:id/risk` (fast, cacheable) with on-chain fallback. Define once backend `03` lands.
* Needed (TBD): Snap ID / install URL, insights renderer copy (LOW/MEDIUM/HIGH/UNKNOWN + reasons), test tx fixtures.
* Demo proof: user about to sign to yield agent → Snap panel with ID + timeline summary + risk → sign/reject with context.

## Envio — indexing on Monad ($1,000 bounty)

* Goal: HyperIndex indexes `AgentRegistered/Updated`, ERC-721 `Transfer`, `AttestationMinted`, agent txs → GraphQL for web + Snap backend.
* Status: **SCAFFOLDED 2026-10-10** — `indexer/` (Envio HyperIndex v3, envio@3.14.0): `config.yaml` (3 contracts on chain 10143, native HyperSync), `schema.graphql` (`Agent`, `Passport`, `Attestation` — `Tx` deferred), TS handlers (`src/handlers/`), on-chain field resolution via Effect API (`src/effects.ts`: `agentOf`/`tokenURI`/`getAttestation` — events don't carry agentId/amount/protocol/uri, so handlers read them from contract storage, cached; avoids a contract redeploy). `Tx` entity from the original proposal omitted (KISS, revisit for Snap).
* Verified: 5 vitest handler tests green (in-memory, no Docker); typecheck clean. **Local sync VERIFIED 2026-10-10**: `pnpm dev` indexed the chain — 15 Agents, passport token 1 → agent 1, attestations 1–2 (STAKE SUCCESS / HARVEST FAIL) with on-chain-resolved fields + derived relations all correct at `http://localhost:8080/v1/graphql` (OrbStack Docker daemon; admin secret `testing`).
* Deploy: GitHub-based (no CLI login) — Envio Deployments app → Add Indexer → root `indexer/`, config `config.yaml`, branch `main` → push. Cloud constraints honored: envio pinned in deps, `packageManager: pnpm@10.32.0`, node ≥ 22.15, imports contained in `indexer/`. **Blocked on: `ENVIO_API_TOKEN`** (V3 HyperSync requires it, local + cloud — owner creates at envio.dev/app/api-tokens) → then `pnpm dev` locally (Docker) and cloud deploy; endpoint → `ENVIO_GRAPHQL_URL`.
* Env keys (`.env.example` root + `indexer/`): `ENVIO_API_TOKEN`, `ENVIO_MONAD_RPC_URL` (fallback chain: → `MONAD_TESTNET_RPC_URL` → public HyperRPC), `ENVIO_GRAPHQL_URL`.
* Demo proof: mint a 5192 on stage → Explorer/Profile updates from indexer (no hardcoded refresh).

## Cross-cutting

* All three need live Monad wiring — coordinate RPC/chain-ID choice once, document in `01-architecture.md`.
* Secrets (`DYNAMIC_*`, `ENVIO_*`, `MONAD_RPC_URL`) go in `.env.example` only as keys, never values.
* Each integration must update its section here + the relevant layer doc in the same commit.
