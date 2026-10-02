# Memory — living log (agents update this)

> Append-only. Newest on top. Keep entries short: date + who + what changed + where.
> Vision/spec live in `docs/00`–`docs/05`. This file is *what happened* + *what's next*.

## Current state (2026-10-02)

* Phase: **first build slice LANDED + COMMITTED** (contracts + API skeleton + tests + docs, one commit). Resume doc: `docs/07-first-slice-plan.md`.
* Verified: `forge test` 53/53 · repo-wide `tsc --noEmit` clean · web tests 23/23 · api tests 15/15.
* Contracts: `contracts/` (Foundry) — `AgentRegistry` (minimal 8004), `AgentPassport` (721, transferable, 1:1), `Reputation` (5192 soulbound + executors), in-house `utils/ERC721.sol` + `Ownable.sol`. Deploy target: Monad testnet (chain ID/RPC TBD).
* API: `apps/api` restructured (`app.ts` factory + `routes/agents.ts` + `AgentRepository` + quarantined `data/mockAgents.ts`); 4 GET endpoints live, mock-backed; 15 tests; `exit 1` stub replaced.
* Shared packages: types (`RiskLevel/AgentSummary/AgentProfile/Attestation/RiskReport`, score omitted — formula TBD), config (`API_ENDPOINTS` for the 4 GETs).
* Product: passkey-native agent identity + reputation on Monad (8004 + 721 Passport + 5192 soulbound). Explorer + Snap verification.
* Repo: `main`, 4 commits (first slice = 4th). `apps/web` cinematic done (fictional). No indexer/wallet/snap yet.
* Tooling: pnpm 12.4.2 `.tools` install repaired (native binary restored via install.js) — plain `pnpm` works normally again.
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

* `2026-10-02` — agent: **completed the first slice**. Contracts: `AgentRegistry`/`AgentPassport`/`Reputation` + in-house ERC721/Ownable bases, 4 test suites (53 tests green). API: types + endpoints, restructure (app factory/routes/repository/quarantined mock), 4 GETs, 15 tests (exit-1 stub replaced). Verified forge/typecheck/web/api. Synced docs 01/02/03/07/README + AGENTS + this file. Committed docs+code together. Not deploying to testnet yet (owner) — next candidates: Envio indexing, Explorer UI, Snap (owner picks).
* `2026-10-02` — agent: repaired broken pnpm 12.4.2 `.tools` install (native binary via install.js) after owner confirmed normal pnpm use elsewhere; re-verified suite via plain `pnpm`.
* `2026-10-02` — agent: caught up on all docs; no plan.md existed → created `docs/07-first-slice-plan.md` as resume point. Locked slice decisions with owner (contracts+API, testnet, Foundry). Scaffolded `contracts/` via `forge init --no-git`. Session paused by owner before any contract code written.
* `2026-09-30` — agent: created `docs/{README,00,01,02,03,04,05,06}` + root `AGENTS.md` (shared memory base, uncommitted). Verified repo snapshot (web/api/packages, git state, fictional-data guards).
* `2026-09-30` — agent: added `MEMORY.md` at root (moved from `docs/memory.md` per owner), wired into README/sync/AGENTS.
* `2026-09-29` — repo: `feat: add design.md` (cinematic landing spec). Prior: cinematic infra/finale impl, first commit.
