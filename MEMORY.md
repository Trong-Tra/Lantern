# Memory — living log (agents update this)

> Append-only. Newest on top. Keep entries short: date + who + what changed + where.
> Vision/spec live in `docs/00`–`docs/05`. This file is *what happened* + *what's next*.

## Current state (2026-10-10)

* **Envio indexer LIVE LOCALLY** (`indexer/`, HyperIndex v3, envio@3.14.0): `pnpm dev` verified against Monad testnet — GraphQL at `http://localhost:8080/v1/graphql` (admin secret `testing`) returns **15 Agents, 1 Passport (agent 1), 2 Attestations (STAKE SUCCESS / HARVEST FAIL)** with derived relations + on-chain fields (Effect API reads `agentOf`/`tokenURI`/`getAttestation`) all correct. 5/5 vitest green, tsc clean. Docker daemon = **OrbStack** (Docker Desktop not installed). Remaining: Envio Cloud deploy (GitHub app, root `indexer/`) → `ENVIO_GRAPHQL_URL` for the API to consume.
* **LIVE: deployed + seeded on Monad testnet (chain 10143, `MONAD_TESTNET_RPC_URL`)** — AgentRegistry `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341`, AgentPassport `0x5Df5E5FD5396e1387A982a7A7450D0c7CEaB40B8`, Reputation `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8`. 15 seed identities registered (agentId 1–15, owner = deployer `0x7EA634e331CF7b503df2e224f77a7C589462F1F2`), verified via `cast` (ownerOf/agentURI; agent 16 reverts). Deployer balance: 4.07 MON. **Addresses must be pasted into root `.env` by owner** (keys added to `.env.example`).
* Phase: **chat brains + Explorer UI + seed/deploy scripts LANDED + COMMITTED** (`d9bca3d`, 2026-10-07). Previous: first slice `8eafd37` (2026-10-02).
* Verified: `forge test` 57/57 · repo-wide `tsc --noEmit` clean · web tests 34/34 · api tests 29/29 · web lint clean. E2E smoke passed (list/profile/invalid/not-found + 2/2 live OpenRouter replies).
* Contracts: `AgentRegistry`/`AgentPassport`/`Reputation` + in-house bases; NEW `script/Deploy.s.sol` + `script/SeedAgents.s.sol` + `script/seed/agents.json` (15 fictional identities, `demo://` URIs) + `test/SeedAgents.t.sol`. **Deployed 2026-10-10** (see top of Current state).
* API: 4 GETs + NEW `POST /api/agents/:id/chat` via `services/openRouterChat.ts` (OpenRouter, `OPENROUTER_API_KEY`/`CHAT_MODEL`, 15s timeout, bounded retry for empty-content flake, injectable for tests). Error codes: INVALID_MESSAGE, INVALID_AGENT_ID, 404, 503 OPENROUTER_NOT_CONFIGURED, 502 CHAT_UPSTREAM_ERROR. Root `.env` loaded (gitignored); root `.env.example` committed (key names only).
* Explorer: NEW `/explore` (list + pagination) + `/agent/[id]` (profile, risk, attestations, identity, chat panel) reading live API. Pure helpers in `libs/explorer/{api,present}.ts` (tested).
* Shared packages: types (+ `ChatMessage/ChatRequest/ChatReply`, `AgentProfile.bio`), config (+ `API_ENDPOINTS.AGENT_CHAT`). Score still omitted (formula TBD → UI shows N/A).
* Product: passkey-native agent identity + reputation on Monad (8004 + 721 Passport + 5192 soulbound). Explorer + Snap verification.
* Repo: `main`. `apps/web` cinematic done (fictional). No indexer/wallet/snap yet.
* Rule restated by owner: forget old 6-week scope doc — it was a draft. Horizon is ~2-day doc sprint → direction → build.

## Decisions (locked unless owner reopens)

* [2026-09-30] Chain = Monad. First asset pair class: MON↔USDC-type intents. (owner)
* [2026-09-30] Identity = ERC-8004 canonical + ERC-721 Passport visual + ERC-5192 locked history. (owner)
* [2026-09-30] Wallet = Dynamic passkey-native (P256/WebAuthn, server-side, no seed). (owner)
* [2026-09-30] Verification = MetaMask Snap (Transaction Insights). Discovery = web explorer. (owner)
* [2026-09-30] Indexer = Envio HyperIndex on Monad → GraphQL. (owner)
* [2026-09-30] Docs are memory: `docs/` + code in same commit, `TBD` > invented values. (agent + owner)
* [2026-10-02] First slice = contracts + API skeleton (not Envio/Snap/Explorer — downstream). (owner)
* [2026-10-02] Network = Monad testnet first; mainnet later. Chain ID/RPC still TBD. (owner)
* [2026-10-02] Contracts toolchain = Foundry. (owner)

## TBD / blocked (owner to answer when ready)

* Monad: **testnet live** — chain ID 10143 confirmed from RPC, contracts deployed 2026-10-10. Mainnet switch still TBD.
* 8004 impl: canonical vs minimal registry + interface freeze.
* 5192 metadata schema + score/risk formula home (contract vs indexer vs API).
* Envio slug/endpoint/schema; Snap ID/install; Dynamic env ID/flow.
* 8004 impl: owner hasn't confirmed canonical vs minimal — first slice codes the minimal interface from `docs/02` (flag in review).

## Log

* `2026-10-10` — agent: **demo runbook written** (`docs/08`) — 4-terminal startup (snap serve on :8081, NOT 8080 — Hasura owns it), 7-act demo narrative with Envio proof moments (Monadscan tx links + GraphQL curl + live 62→63 attestation), failure drills, offline mock fallback.
* `2026-10-10` — agent: **wallet + live vault deposits landed** — `vault-panel.tsx` (wagmi v3 + injected connector; RainbowKit deferred, no WC projectId needed) on agent 1's profile: deposit/withdraw vs the live AgentVault, balance read, Monadscan tx links, indexer picks up the minted attestation. Providers wrap root layout; panel self-disables without NEXT_PUBLIC_MONAD_RPC_URL. Gotcha: `next start` does NOT load root .env — DATA_SOURCE must also live in apps/web/.env (server-only var, no client leak). Verified: next build clean; /agent/1 renders 62 real attestations + live banner + stake panel. web tests 36/36.
* `2026-10-10` — agent: **live-data mode landed** — `DATA_SOURCE=envio` switches the API to `envioAgentRepository` (Hasura GraphQL, v0 risk banding owner-approved: <10 execs UNKNOWN, <5% LOW, <15% MEDIUM, else HIGH, reasons stated). Verified live: 15 agents w/ URI-slug names, agent 1 profile with 62 attestations + txHashes, vault lookup resolves. `Attestation.txHash` added; profile links to testnet.monadscan.com; DemoBanner live prop (emerald/amber). Chat prompt honesty switches on data source (ipfs://mock-* vs live). api 46/46, web 34/34. Root `.env` now carries DATA_SOURCE=envio + vault address.
* `2026-10-10` — agent: **MetaMask Snap landed** — `packages/snap/` (Transaction Insights; snaps-sdk 12.0.1 pinned for prod MetaMask compat; v12 = plain component objects, no builder fns; webpack needs extensionless relative imports). `onTransaction` → lookup endpoint → panel with honest fallbacks (unknown agent / contract deploy / wrong chain / API down). 9 vitest + SES-eval'd bundle. Demo: `pnpm serve` in packages/snap + MetaMask Flask. Committed separately: contracts (8e83bfa), api lookup (5dfdd40), snap.
* `2026-10-10` — agent: **API lookup endpoint for the Snap** — `GET /api/agents/lookup/:address` (registered before `/:id`; `ApiResponse<AgentSummary|null>`, 400 INVALID_ADDRESS; repository `findByAddress` matches agent owner case-insensitively + demo vault via env `AGENT_VAULT_ADDRESS`/`AGENT_VAULT_AGENT_ID`). api tests 33/33.
* `2026-10-10` — agent: **AgentVault + demo attestation history LIVE** — `AgentVault.sol` (deposit/withdraw mint STAKE/UNSTAKE attestations; plain sends revert) deployed at `0xe09b383696D69B8A3Dfb2081a446D8fc62826328` serving agent 1, executor authorized (`DeployAgentVault.s.sol`). `SeedAttestations.s.sol` + `attestations.json` minted 120 fictional attestations for agents 1–5 (tokenIds 3–122, ~86% success). forge 71/71.
* `2026-10-10` — agent: **ran indexer locally end-to-end** — OrbStack provides the Docker daemon (Docker Desktop absent); stale `generated-graphql-engine-1` container blocked port 8080 (removed). Live sync verified via Hasura GraphQL: 15 Agents, passport 1→agent 1, attestations 1–2 with enums/amounts/URIs resolved on-chain; derived relations (`Agent.passports`, `Agent.attestations`) resolve.
* `2026-10-10` — agent: **scaffolded Envio indexer** in `indexer/` (workspace member, `pnpm@10.32.0` pinned for Envio Cloud). Design: events-only + Effect API storage reads for fields events don't carry (no contract change needed; drop effects if contracts later emit richer events). On-chain test data minted with deployer key: passport token 1 (agent 1), attestations 1 (STAKE SUCCESS) + 2 (HARVEST FAIL) — soulbound pipeline exercised. Discovery: HyperSync V3 requires `ENVIO_API_TOKEN`; Envio Cloud deploy is GitHub-app-based (no CLI login); single-object `@derivedFrom` unsupported (list form used). Synced docs 01/05/README + this file.
* `2026-10-10` — agent: **deployed + seeded on Monad testnet** (chain 10143): `Deploy.s.sol` → 3 identity contracts, `SeedAgents.s.sol` → 15 identities, both `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`, verified via `cast`. Re-verified `forge test` 57/57 after discarding stale rewrites (resumed session had re-authored contracts from outdated docs — restored via `git checkout`, committed versions were canonical). Added `ENVIO_GRAPHQL_URL` / `NEXT_PUBLIC_DYNAMIC_ENV_ID` keys to `.env.example` templates. Owner fetching Envio slug + Dynamic env ID; Snap needs only local dev (MetaMask Flask), no signup.
* `2026-10-07` — agent: landed **chat brains** (OpenRouter-backed `POST /api/agents/:id/chat`, persona system prompt that forbids inventing chain data, retry on empty content, 29 api tests), **Explorer UI** (`/explore` list + `/agent/[id]` profile with chat panel, pure data helpers, 34 web tests), and **seed/deploy scripts** (Deploy.s.sol + SeedAgents.s.sol + 15-identity agents.json, 57 forge tests — ready, NOT run per owner). Root `.env.example` added; `.env` stays gitignored. Docs synced: 01/02/03/04/05/README/AGENTS + this file.
* `2026-10-02` — agent: **completed the first slice**. Contracts: `AgentRegistry`/`AgentPassport`/`Reputation` + in-house ERC721/Ownable bases, 4 test suites (53 tests green). API: types + endpoints, restructure (app factory/routes/repository/quarantined mock), 4 GETs, 15 tests (exit-1 stub replaced). Verified forge/typecheck/web/api. Synced docs 01/02/03/07/README + AGENTS + this file. Committed docs+code together. Not deploying to testnet yet (owner) — next candidates: Envio indexing, Explorer UI, Snap (owner picks).
* `2026-10-02` — agent: repaired broken pnpm 12.4.2 `.tools` install (native binary via install.js) after owner confirmed normal pnpm use elsewhere; re-verified suite via plain `pnpm`.
* `2026-10-02` — agent: caught up on all docs; no plan.md existed → created `docs/07-first-slice-plan.md` as resume point. Locked slice decisions with owner (contracts+API, testnet, Foundry). Scaffolded `contracts/` via `forge init --no-git`. Session paused by owner before any contract code written.
* `2026-09-30` — agent: created `docs/{README,00,01,02,03,04,05,06}` + root `AGENTS.md` (shared memory base, uncommitted). Verified repo snapshot (web/api/packages, git state, fictional-data guards).
* `2026-09-30` — agent: added `MEMORY.md` at root (moved from `docs/memory.md` per owner), wired into README/sync/AGENTS.
* `2026-09-29` — repo: `feat: add design.md` (cinematic landing spec). Prior: cinematic infra/finale impl, first commit.
