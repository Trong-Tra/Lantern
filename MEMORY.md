# Memory — living log (agents update this)

> **Cold start: read §Current state below (that's the truth) + your one layer doc.** Log = recent history; pre-pivot history lives in git.
> Vision/spec live in `docs/` (map in `AGENTS.md`). Docs describe TARGET; this section describes NOW.

## Current state (2026-11-14 — pivot 3: solver arena)

**Product (new concept):** Lantern is a **competitive multihop swap routing arena** on Monad. We build and serve the **pool graph** (assets = nodes, pools = edges). Off-chain **solver agents** — each with an on-chain ERC-8004 identity — compete on every swap intent: they propose routes **and split allocations** across routes (the slicing problem: coarse slices solve fast, fine slices price better). The user takes the best solution; the winning solver earns the fee. Track record is **earned on-chain** via soulbound ERC-5192 attestations of real execution outcomes — no self-claimed reputation, no persona marketing.

**What exists NOW (after the 2026-11-14 prune):**

* **Contracts** (`contracts/`, Foundry): `AgentRegistry` (minimal ERC-8004) + `Reputation` (ERC-5192 soulbound attestations) only. Live on Monad testnet (chain 10143): Registry `0x62cd4e0C…a6341`, Reputation `0xb5A7CEB3…b72f8`; 15 seeded demo agents + 120 seeded attestations from the old demo still on-chain. `forge test` 53/53.
* **API** (`apps/api`, Express 5, port 4000): identity read layer over the indexer — `GET /`, `GET /api/hello`, `GET /api/agents`, `GET /api/agents/:id`, `GET /api/agents/:id/attestations`. Raw counts only — **no score, no risk banding, no chat, no lookup** (deleted with the old concept). Envio GraphQL is the only data source (mock source deleted). 18/18 tests.
* **Indexer** (`indexer/`, Envio HyperIndex v3): indexes Registry + Reputation → GraphQL `:8080` local. Passport entity/handler removed. 4/4 vitest.
* **Web** (`apps/web`): **frozen — untouched in the pivot.** Landing style/vibe/name stay. Explorer pages, chat/swap/vault panels, and `/wallet` still reference removed API/types/config exports, so **web typecheck/build is expected to fail until the frontend rebuild**. Do not fix it piecemeal.
* **Gone:** AgentPassport, AgentVault, DemoFXPool + mock tokens, MetaMask Snap (`packages/snap`), OpenRouter chat, Lumen score/risk, quarantined mock data, all FinTechathon hackathon artifacts (docs/08, docs/09, EXECUTION_EVIDENCE, SECURITY, TEST_CASE).

**Missing / next (the arena build):** pool-graph model + registry of pools, arena contract(s) (intents, solution submission, winner settlement, fees), solver protocol/off-chain solver SDK, quote API, new swap UI. None of it exists yet — do not build on deleted code (git history has it if ever needed).

## Decisions (locked unless owner reopens)

* [2026-09-30] Chain = Monad. Identity = ERC-8004 canonical-style registry + ERC-5192 soulbound history.
* [2026-10-02] Contracts toolchain = Foundry. Network = Monad testnet first (live since 2026-10-10, chain 10143).
* [2026-09-30] Docs are memory: docs/ + code in same commit, `TBD` > invented values.
* [2026-11-14] **Pivot 3:** product = multihop swap solver arena (Matcha-style aggregation, but an open competitive network of ERC-8004-identified solvers). Identity + soulbound track record survive; everything persona/score/demo-protocol related was pruned.
* [2026-11-14] Frontend is frozen until its own rebuild session — backend work must not touch `apps/web`.

## TBD / blocked (owner to answer when ready)

* Arena design: pool-graph source (own demo pools vs existing Monad DEXs), solution submission format, winner selection (best-quote vs auction), fee split, solver deposit/slashing (if any).
* Whether attestation `ActionType` enum (`STAKE/UNSTAKE/HARVEST/SWAP`) gets reworked for arena outcomes (contract change → redeploy + reindex).
* Monad mainnet switch. Envio cloud deploy (`ENVIO_API_TOKEN`).

## Log (newest on top; older entries were pruned)

* `2026-11-14` — agent: **agent-nav redesign** — docs renamed to semantic names (`architecture/contracts/api/indexer.md`; `frontend.md` frozen-historical, off the map); single routing table in AGENTS.md, docs/README.md now just points back; all code/comment references updated; stale `contracts/out/` artifacts cleared; seed JSON disclaimers de-referenced from deleted docs. Forge 53/53, api 18/18.
* `2026-11-14` — agent: **pivot-3 prune executed** — contracts cut to Registry + Reputation (53/53); API cut to 3 agent GETs over Envio only (18/18; chat/scoring/risk/lookup/mock deleted); snap package deleted; indexer Passport removed (4/4); hackathon docs deleted; MEMORY/AGENTS/README/docs 01–03,05 rewritten for the solver-arena concept. Web frozen (known-broken typecheck until frontend rebuild).
* `2026-11-07` — Tai frontend release on `frontend-Tai`: cinematic twelve-chapter landing, 97 frontend tests. (Pre-pivot; frontend now frozen.)
* `2026-10-20` — FinTechathon submission era ends (Topic F agent-wallet; docs removed in the pivot — see git history).
