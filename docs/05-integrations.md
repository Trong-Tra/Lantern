# 05 — Integrations (Dynamic / MetaMask Snap / Envio)

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
* Status: missing (no Envio project, no schema, no endpoint).
* Needed (TBD): project slug, network (Monad mainnet vs testnet + chain ID), contract addresses, `ENVIO_GRAPHQL_URL`, entity schema (`Agent`, `Passport`, `Attestation`, `Tx`), backfill plan.
* Demo proof: mint a 5192 on stage → Explorer/Profile updates from indexer (no hardcoded refresh).

## Cross-cutting

* All three need live Monad wiring — coordinate RPC/chain-ID choice once, document in `01-architecture.md`.
* Secrets (`DYNAMIC_*`, `ENVIO_*`, `MONAD_RPC_URL`) go in `.env.example` only as keys, never values.
* Each integration must update its section here + the relevant layer doc in the same commit.
