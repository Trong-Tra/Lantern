# Memory — living log (agents update this)

> **Cold start: read §Current state below (that's the truth) + your one layer doc.** Log = last ~week of history; older entries were pruned (submission artifacts, pre-live plans).
> Vision/spec live in `docs/00`–`docs/05` + `09`. Docs describe TARGET; this section describes NOW.

## Current state (2026-10-18)

* **Contracts LIVE on Monad testnet** (chain 10143): `AgentRegistry` `0x62cd4e0C…a6341`, `AgentPassport` `0x5Df5E5FD…40B8`, `Reputation` `0xb5A7CEB3…b72f8`, `AgentVault` `0xe09b3836…26328` (serves agent 1), **`DemoFXPool` v2 `0xC8929Caa…77cd` + mocks mUSDC / mCNY / mSGD** (agent-wallet corridor = CURRENT demo; v2 redeployed 2026-10-18 with re-enroll-after-exhaustion — same wallet keeps its funds; v1 retired; pool authorized Reputation executor — verified on-chain). Retired DemoSwap/`MockUSDC` removed. 15 seed agents + 120 seeded attestations; deployer/owner `0x7EA634e3…2F1F2` (~2.09 MON left). Addresses in root `.env` + docs/02. `forge test` 90/90 (incl. `LumenGasComparison` gas proof, docs/09 §4.2).
* **API** (`apps/api`, port 4000): serves **live indexer data** (`DATA_SOURCE=envio`, local Hasura `:8080/v1/graphql`) — 5 GETs + Snap lookup + `POST /api/agents/:id/chat` (OpenRouter, model fallback chain). **Lumen score off-chain** in `repositories/scoring.ts` (v1 shipped; v2 formula canonical in docs/09 §4.2, not yet recoded). Risk v0 banding. 85/85 tests.
* **Web** (`apps/web`, dev `:3000` — RAAC's server stopped there 2026-10-16; auto-falls to `:3001`): cinematic landing + `/network` + `/agent/[id]` (profile, chat, live vault deposit panel + **agent-wallet corridor panel** `swap-demo-panel.tsx`: permanent agent wallet auto-signs swaps; MetaMask funds/withdraws) + `/docs`. 36/36 tests. Connect wallet = real injected wagmi; Dynamic passkey still missing.
* **Envio indexer** (`indexer/`, HyperIndex v3): LIVE locally (OrbStack Docker; GraphQL `:8080`, admin secret `testing`) — 15 Agents / 1 Passport / attestations verified. Cloud deploy blocked on `ENVIO_API_TOKEN` only.
* **MetaMask Snap** (`packages/snap/`): Transaction Insights — `onTransaction` → `GET /api/agents/lookup/:address` → identity/risk panel. 9 vitest; local Flask `:8081` only, public Snap ID TBD.
* **Hackathon track (active)**: FinTechathon PBCSF/WeBank Shenzhen International, **Topic F — Agent Wallet**; deadline **2026-10-20 23:59 Beijing**. Canonical framing: `docs/09-agent-wallet-strategy.md` (**v2**; single-entry locked). Product vocabulary (Qualified Agents List, Wallet Worker Slot, dual registration) is VISION-level — code truth is 4 contracts + explorer + Snap; **no on-chain RGA gate yet** (score write-back = missing 50%).
* **Missing / blockers**: manual browser+MetaMask dry run of agent-wallet corridor; user Dashboard, Dynamic passkey wallet, Envio cloud deploy. Repo: `main`, pnpm@12.4.2 monorepo.

## Decisions (locked unless owner reopens)

* [2026-09-30] Chain = Monad. First asset pair class: MON↔USDC-type intents.
* [2026-09-30] Identity = ERC-8004 canonical + ERC-721 Passport visual + ERC-5192 locked history.
* [2026-09-30] Wallet = Dynamic passkey-native (P256/WebAuthn, server-side, no seed).
* [2026-09-30] Verification = MetaMask Snap (Transaction Insights). Discovery = web explorer.
* [2026-09-30] Indexer = Envio HyperIndex on Monad → GraphQL.
* [2026-09-30] Docs are memory: docs/ + code in same commit, `TBD` > invented values.
* [2026-10-02] First slice = contracts + API skeleton (not Envio/Snap/Explorer — downstream).
* [2026-10-02] Network = Monad testnet first; mainnet later. Testnet live: chain 10143 (2026-10-10).
* [2026-10-02] Contracts toolchain = Foundry.
* [2026-10-16] Single FinTechathon entry: Topic F only; cross-border = flagship story inside it.

## TBD / blocked (owner to answer when ready)

* Monad mainnet switch (testnet live since 2026-10-10).
* 8004 impl: canonical vs minimal registry + interface freeze.
* 5192 metadata schema + score/risk formula home (API-side now; v2 in-contract planned).
* Envio cloud deploy (`ENVIO_API_TOKEN` owner) → `ENVIO_GRAPHQL_URL`. Snap: public ID/npm publish. Dynamic: env ID/flow.
* FinTechathon: team registration + passport pages (deadline 2026-10-20); CNY corridor partner (HK-first) — post-submission.

## Log (newest on top; older entries were pruned)

* `2026-10-18` — agent: **codebase cleanup** — removed retired DemoSwap protocol (`DemoSwap.sol`, `MockUSDC.sol`, `DeployDemoSwap.s.sol`, `RunAgentSwaps.s.sol`, `DemoSwap.t.sol`); removed dead web container `src/containers/home` + `containers/index.ts` barrel; removed `docs/archive/` (video scripts, demo plan, first-slice plan, memory-log); deleted `docs/06-agent-sync.md`, `docs/07-first-slice-plan.md`, `docs/09-video-scripts.md`. Updated `docs/README.md` doc map and `contracts/README.md`. Forge 90/90, next build OK, web lint 0 / tests 36/36. ⚠ uncommitted.
* `2026-10-18` — agent: **2-wallet architecture fixed + clean simple UI** — agent wallet is a separate permanent key (`localStorage`, never regenerated, funds never lost) that auto-signs all swaps (user never signs a trade); user MetaMask wallet funds it and withdraws anytime (agent auto-sends MON back, keeps gas reserve). Panel: no wallet → "Create agent wallet"; has wallet → shortened address + monadscan link, balance, Fund input, Withdraw whenever spendable MON exists (not gated by run minimum), "Release agent"/"Continue agent" when balance ≥ 0.6 MIN, live swap steps, done → asset summary. No pool credit/parking (funds live in agent wallet directly). Forge 90/90, ESLint 0, tsc 0, next build OK, web 36/36. ⚠ uncommitted.
* `2026-10-18` — agent: **wallet made PERMANENT + resume/run-again** — pool v2 `0xC8929Caa…77cd` redeployed with re-enroll-after-exhaustion; panel: all wallet-destruction/reset UI removed, paused runs → "Continue agent" (resume from live chain state), exhausted → "Run again" (fresh mandate, same wallet). Web: lint 0 / 36/36 / SSR 200. ⚠ uncommitted.
* `2026-10-18` — agent: **API env-loading race fixed** (commit `19af488`) — network page showed 3 mock agents; fixed with `apps/api/src/loadEnv.ts` imported FIRST in index.ts. Verified: 15 live agents, api 60/60.
* `2026-10-10` — agent: **live-data mode landed** — `DATA_SOURCE=envio` switches API to Envio repo; 15 agents w/ URI-slug names, agent 1 profile with 62 attestations + txHashes, vault lookup resolves. api 46/46, web 34/34.
