# Memory — living log (agents update this)

> **Cold start: read §Current state below (that's the truth) + your one layer doc.** Log = recent history; pre-pivot history lives in git.
> Vision/spec live in `docs/` (map in `AGENTS.md`). Docs describe TARGET; this section describes NOW.

## Current state (2026-11-14 — pivot 3: Lantern Graph + Market)

**Product (new concept):** two planes on Avalanche (Fuji first). **Lantern Graph** = we build/maintain the live pool graph (assets = nodes, pools = edges) and sell access to solver agents via **x402** — paying us beats running their own indexing. **Lantern Market** = a user posts a swap intent; solvers (ERC-8004 identities) answer with **signed route + split-allocation quotes** that **stream in one by one** (every solver's algorithm/latency differs); the user picks one; quotes carry deadlines and solvers can retract them as pools shift. Only the picked quote settles on-chain — the solver earns the fee, and an ERC-5192 attestation mints. Standing is earned by being picked and executing — never claimed.

**What exists NOW (after the 2026-11-14 prune + Phase 0 code):**

* **Contracts** (`contracts/`, Foundry): identity (`AgentRegistry` ERC-8004 + `Reputation` ERC-5192) + market (`MockToken` open-mint ERC-20, `DemoPool` constant-product pair with owner-only `seed()`, `LanternMarket.executeSwap` settling user-picked signed quotes — EIP-191 sig → `registry.ownerOf(agentId)`, deadline/nonce checks, re-quote vs live reserves, 20 bps solver fee, SWAP/SUCCESS attestation). `forge test` 93/93. `script/DeployMarket.s.sol` deploys 5 tokens / 9 pools from `script/seed/market.json`. Legacy Monad deployment (10143): Registry `0x62cd4e0C…a6341`, Reputation `0xb5A7CEB3…b72f8` — read-only. **Fuji redeploy still pending (owner faucet AVAX).**
* **API** (`apps/api`, Express 5, port 4000): identity read layer over the indexer — `GET /`, `GET /api/hello`, `GET /api/agents`, `GET /api/agents/:id`, `GET /api/agents/:id/attestations`. Raw counts only — **no score, no risk banding, no chat, no lookup** (deleted with the old concept). Envio GraphQL is the only data source (mock source deleted). 18/18 tests.
* **Indexer** (`indexer/`, Envio HyperIndex v3): re-pointed to Fuji 43113 with zero-address placeholders until the redeploy; indexes Registry + Reputation + `DemoPool.Sync` (→ `Pool` reserves) + `LanternMarket.TradeSettled` (→ `Trade`). 7/7 vitest + tsc clean.
* **Web** (`apps/web`): **frozen — untouched in the pivot.** Landing style/vibe/name stay. Explorer pages, chat/swap/vault panels, and `/wallet` still reference removed API/types/config exports, so **web typecheck/build is expected to fail until the frontend rebuild**. Do not fix it piecemeal.
* **Gone:** AgentPassport, AgentVault, DemoFXPool + mock tokens, MetaMask Snap (`packages/snap`), OpenRouter chat, Lumen score/risk, quarantined mock data, all FinTechathon hackathon artifacts (docs/08, docs/09, EXECUTION_EVIDENCE, SECURITY, TEST_CASE).

**Missing / next (build plan: `docs/market.md`):** demo pools + `LanternMarket.sol` (signed-quote settlement), Go service `services/market/` (graph ingest/store, x402-gated graph feed, quote WS protocol, reference solver, gqlgen API), indexer extension. None of it exists yet — do not build on deleted code (git history has it if ever needed).

## Decisions (locked unless owner reopens)

* [2026-09-30] ~~Chain = Monad~~ — **superseded 2026-11-14: chain = Avalanche (Fuji testnet 43113 first, C-Chain later).** Identity stack redeploys to Fuji; Monad testnet deployment is legacy read-only. Identity = ERC-8004 canonical-style registry + ERC-5192 soulbound history (unchanged).
* [2026-10-02] Contracts toolchain = Foundry. Network = testnet first.
* [2026-09-30] Docs are memory: docs/ + code in same commit, `TBD` > invented values.
* [2026-11-14] **Pivot 3:** product = Lantern Graph + Market (Matcha-style aggregation, but solvers are an open network of ERC-8004-identified agents buying the graph and streaming quotes; the user picks). Identity + soulbound track record survive; everything persona/score/demo-protocol related was pruned. **"Arena" naming rejected by owner — use Graph + Market.**
* [2026-11-14] **Market v1 scope locked:** own demo pools first (adapter interface for real DEXs later); settlement on-chain for the **user-picked quote only** (solutions = signed off-chain quotes with deadlines, retractable; no on-chain submission window); one reference solver in the Go service, protocol designed for external solvers from day one.
* [2026-11-14] **x402 = the paywall rail** for Lantern Graph access (facilitator/support on Fuji TBD — verify before Phase 3).
* [2026-11-14] **Backend = Go** (`services/market/`, separate Go module). Envio stays the indexing layer (Hasura GraphQL subscriptions = realtime feed). Solver transport = raw WebSocket; GraphQL (gqlgen) is frontend-facing only.
* [2026-11-14] Frontend is frozen until its own rebuild session — backend work must not touch `apps/web`.

## TBD / blocked (owner to answer when ready)

* **Fuji redeploy (Phase 0, the only Phase 0 remainder):** deployer wallet needs Fuji AVAX (faucet); then `Deploy.s.sol` → `DeployMarket.s.sol` → optional seeders; fill real addresses into `.env`, `indexer/config.yaml` placeholders, README table.
* **x402 on Fuji:** facilitator + payment asset support — verify before Phase 3.
* Whether attestation `ActionType` enum (`STAKE/UNSTAKE/HARVEST/SWAP`) gets reworked for settlement outcomes (contract change → redeploy + reindex; v1 reuses SWAP).
* Avalanche C-Chain mainnet switch (post-Fuji). Envio cloud deploy (`ENVIO_API_TOKEN`).

* [2026-11-14] **Market parameters locked (owner):** solver fee 20 bps, quote TTL ~45s (off-chain guidance; contract enforces `deadline` only), v1 `executeSwap` submitter = user wallet, failures mint nothing. Demo pool topology: 5 tokens / 9 pools (`script/seed/market.json`).

## Log (newest on top; older entries were pruned)

* `2026-11-14` — agent: **Phase 0 code complete (chain move + market contracts)** — `MockToken` + `DemoPool` (constant-product, 30 bps, owner `seed()`) + `LanternMarket` (signed-quote settlement, 20 bps solver fee, attestation on settle) with 93/93 forge tests; `DeployMarket.s.sol` + `seed/market.json` (5 tokens/9 pools); env renamed to `AVAX_FUJI_RPC_URL`/`DEPLOYER_PRIVATE_KEY`; explorer → Snowtrace; indexer re-pointed to Fuji 43113 with `Pool`/`Trade` entities + placeholder addresses (7/7 vitest). **Blocked: Fuji redeploy needs owner faucet AVAX.**
* `2026-11-14` — agent: **renamed arena → Lantern Graph + Market + flow redesign** (owner): solvers buy the maintained pool graph via x402; solutions are signed off-chain quotes that stream in one-by-one and can be retracted; only the user-picked quote settles on-chain (`LanternMarket.executeSwap` — no submission window, no contract-side best-pick). `docs/arena.md` → `docs/market.md` rewritten; rename swept through AGENTS/README/GETTING_STARTED/docs.
* `2026-11-14` — agent: **destination chain = Avalanche** — full move decided (owner): Fuji testnet 43113 first, C-Chain later; identity stack redeploys to Fuji, Monad deployment becomes legacy read-only. Envio supports Fuji natively (`fuji.hypersync.xyz`).
* `2026-11-14` — agent: **market build plan landed** — owner locked v1 scope: own demo pools, on-chain settlement, reference solver in a new Go service (gqlgen for web + raw WS for solvers, Envio subscriptions as the realtime feed). Phases 0–4 defined.
* `2026-11-14` — agent: **agent-nav redesign** — docs renamed to semantic names (`architecture/contracts/api/indexer.md`; `frontend.md` frozen-historical, off the map); single routing table in AGENTS.md, docs/README.md now just points back; all code/comment references updated; stale `contracts/out/` artifacts cleared; seed JSON disclaimers de-referenced from deleted docs. Forge 53/53, api 18/18.
* `2026-11-14` — agent: **pivot-3 prune executed** — contracts cut to Registry + Reputation (53/53); API cut to 3 agent GETs over Envio only (18/18; chat/scoring/risk/lookup/mock deleted); snap package deleted; indexer Passport removed (4/4); hackathon docs deleted. Web frozen (known-broken typecheck until frontend rebuild).
* `2026-11-07` — Tai frontend release on `frontend-Tai`: cinematic twelve-chapter landing, 97 frontend tests. (Pre-pivot; frontend now frozen.)
