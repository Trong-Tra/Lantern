# Memory — living log (agents update this)

> Append-only. Newest on top. Keep entries short: date + who + what changed + where.
> Vision/spec live in `docs/00`–`docs/05`. This file is *what happened* + *what's next*.

## Current state (2026-10-07)

* Phase: **chat brains + Explorer UI + seed/deploy scripts LANDED + COMMITTED** (`d9bca3d`, 2026-10-07). Previous: first slice `8eafd37` (2026-10-02).
* Verified: `forge test` 57/57 · repo-wide `tsc --noEmit` clean · web tests 34/34 · api tests 29/29 · web lint clean. E2E smoke passed (list/profile/invalid/not-found + 2/2 live OpenRouter replies).
* Contracts: `AgentRegistry`/`AgentPassport`/`Reputation` + in-house bases; NEW `script/Deploy.s.sol` + `script/SeedAgents.s.sol` + `script/seed/agents.json` (15 fictional identities, `demo://` URIs) + `test/SeedAgents.t.sol`. **Not executed on-chain** (owner: testnet deploy deferred).
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

* Monad network: testnet vs mainnet, chain ID, RPC.
* 8004 impl: canonical vs minimal registry + interface freeze.
* 5192 metadata schema + score/risk formula home (contract vs indexer vs API).
* Envio slug/endpoint/schema; Snap ID/install; Dynamic env ID/flow.
* 8004 impl: owner hasn't confirmed canonical vs minimal — first slice codes the minimal interface from `docs/02` (flag in review).

## Log

* `2026-10-07` — agent: landed **chat brains** (OpenRouter-backed `POST /api/agents/:id/chat`, persona system prompt that forbids inventing chain data, retry on empty content, 29 api tests), **Explorer UI** (`/explore` list + `/agent/[id]` profile with chat panel, pure data helpers, 34 web tests), and **seed/deploy scripts** (Deploy.s.sol + SeedAgents.s.sol + 15-identity agents.json, 57 forge tests — ready, NOT run per owner). Root `.env.example` added; `.env` stays gitignored. Docs synced: 01/02/03/04/05/README/AGENTS + this file.
* `2026-10-02` — agent: **completed the first slice**. Contracts: `AgentRegistry`/`AgentPassport`/`Reputation` + in-house ERC721/Ownable bases, 4 test suites (53 tests green). API: types + endpoints, restructure (app factory/routes/repository/quarantined mock), 4 GETs, 15 tests (exit-1 stub replaced). Verified forge/typecheck/web/api. Synced docs 01/02/03/07/README + AGENTS + this file. Committed docs+code together. Not deploying to testnet yet (owner) — next candidates: Envio indexing, Explorer UI, Snap (owner picks).
* `2026-10-02` — agent: repaired broken pnpm 12.4.2 `.tools` install (native binary via install.js) after owner confirmed normal pnpm use elsewhere; re-verified suite via plain `pnpm`.
* `2026-10-02` — agent: caught up on all docs; no plan.md existed → created `docs/07-first-slice-plan.md` as resume point. Locked slice decisions with owner (contracts+API, testnet, Foundry). Scaffolded `contracts/` via `forge init --no-git`. Session paused by owner before any contract code written.
* `2026-09-30` — agent: created `docs/{README,00,01,02,03,04,05,06}` + root `AGENTS.md` (shared memory base, uncommitted). Verified repo snapshot (web/api/packages, git state, fictional-data guards).
* `2026-09-30` — agent: added `MEMORY.md` at root (moved from `docs/memory.md` per owner), wired into README/sync/AGENTS.
* `2026-09-29` — repo: `feat: add design.md` (cinematic landing spec). Prior: cinematic infra/finale impl, first commit.
