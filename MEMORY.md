# Memory — living log (agents update this)

> **Cold start: read §Current state below (that's the truth) + your one layer doc.** Log = recent history; pre-pivot history lives in git.
> Vision/spec live in `docs/` (map in `AGENTS.md`). Docs describe TARGET; this section describes NOW.

## Current state (2026-11-17 — pivot 3: Lantern Finance Graph + Market)

**Product (new concept):** two planes on Avalanche (Fuji first). **Lantern Finance Graph** = we build/maintain the live pool graph (assets = nodes, pools = edges) and sell access to solver agents via **x402** — paying us beats running their own indexing. **Lantern Finance Market** = a user posts a swap intent; solvers (ERC-8004 identities) answer with **signed route + split-allocation quotes** that **stream in one by one** (every solver's algorithm/latency differs); the user picks one; quotes carry deadlines and solvers can retract them as pools shift. Only the picked quote settles on-chain — the solver earns the fee, and an ERC-5192 attestation mints. Standing is earned by being picked and executing — never claimed.

**Landing page state (from frontend-Tai, merged 2026-11-18):**

* **Story = Graph + Market (2026-11-20)**: `/` tells the current product, not the pre-pivot trust-layer/score/corridor story. Twelve chapters keep their ids/slots (3D choreography, `WORLD_CHAPTERS`, anchors), only copy changed: solvers rebuild the same map (01–03) → one live pool graph sold over x402 (05) → identity + earned record (04/06) → intent, streaming signed quotes, you pick (07) → picked quote settles on Fuji, fee to its solver, attestation minted (08) → Avalanche foundation (09). `reference-details.tsx` widgets rewritten (graph card, attestation list, `mUSDC → mWAVAX` intent checks, six-step settlement flow, stack = pool graph/quote protocol/ERC-8004/ERC-5192/Fuji). Finale CTA = `Enter the market` → `/exchange`, `Contracts` → Snowtrace (LanternMarket `0xE777…f70B`), Docs; `layout.tsx` metadata description updated. No Lumen/score/corridor/passport/Monad copy left on `/`; dead `.passport-pages` CSS stays.

* **First handoff visibility (2026-11-16)**: circular strands stay lit through departure onto the two lanes (first 36% of handoff); ribbon keeps strand outlines and destination network reveals only at the end.

* **Artwork continuity (2026-11-16)**: later chapter artwork shares one animation clock and holds its last prepared pose while the worker catches up; existing spatial handoffs retained from frontend-Tai.

* **Landing animation fix (2026-11-16)**: visible panel weights map to all 12 authored chapter slots; disabled preview stays zero, preserving finite finale geometry and original transition IDs.

* **Landing content (2026-11-16)**: Lotus research receipt removed. Ask Lantern Finance chapter/demo disabled through PRODUCT_PREVIEW_ENABLED; code retained, demo links hidden.

* **Landing logo (2026-11-16)**: animated ring centerpiece uses the Avalanche (AVAX) two-peak mark; existing gold light paths and ring animation retained.

* **Swap mode height (2026-11-15)**: Swap uses the chart's 510-640px viewport-responsive minimum height; Limit/Advanced remain intrinsic and expanded settings can grow without inner scrolling.

**What exists NOW (after the pivot prune + Phases 0–2):**

* **Contracts** (`contracts/`, Foundry): identity (`AgentRegistry` ERC-8004 + `Reputation` ERC-5192) + market (`MockToken` open-mint ERC-20, `DemoPool` constant-product pair with owner-only `seed()`, `LanternMarket.executeSwap` settling user-picked signed quotes — EIP-191 sig → `registry.ownerOf(agentId)`, deadline/nonce checks, re-quote vs live reserves, 20 bps solver fee, SWAP/SUCCESS attestation). `forge test` 93/93. `script/DeployMarket.s.sol` deploys 5 tokens / 9 pools from `script/seed/market.json`. **Fuji 43113 deployed 2026-11-15** (deployer `0x7EA6…F1F2`): Registry `0x62cd4e0C…a6341`, Reputation `0x5Df5E5FD…40B8`, LanternMarket `0xE77719De…f70B`, 5 tokens + 9 pools + 15 agents + 120 attestations seeded (addresses in README + `docs/contracts.md`). **Dual-registration executed 2026-11-18** — all 15 agents registered on the canonical ERC-8004 Fuji singleton `0x8004A818…BD9e` (token ids **314–328**, `DualRegister.s.sol`, mapping `script/seed/dual-registered.json`, all 15 live on 8004scan). Monad 10143 deployment legacy read-only.
* **API: REMOVED 2026-11-15** — `apps/api` (Express 5, port 4000) deleted on owner's call so the concurrent frontend rebuild targets the Go API instead of the old routes (which were never the plan post-pivot). Backend = `services/market/` (Go). Web-facing identity reads = the gqlgen API (`services/market/internal/api`) — **built 2026-11-16** (`POST|GET /graphql` + `/healthz` on `:8082`; schema = `internal/api/schema.graphqls`, see `docs/api.md`). Old routes/types in git history; `docs/api.md` documents the new contract.
* **Indexer** (`indexer/`, Envio HyperIndex v3): Fuji 43113 with **real addresses** in `config.yaml` (Registry, Reputation, LanternMarket, all 9 pools via one `DemoPool` entry with an `address:` list — repeating `- name: DemoPool` breaks simulate routing). Indexes Registry + Reputation + `DemoPool.Sync` (→ `Pool` reserves) + `LanternMarket.TradeSettled` (→ `Trade`). 7/7 vitest + tsc clean.
* **Market service** (`services/market/`, Go 1.23+ own module): **Phases 1–3 done** — config (root `.env`, incl. Phase 2 + x402 keys), Hasura WS subscription ingest (`internal/ingest`), in-memory pool-graph store (`internal/graph`), on-chain reserve spot-check (`internal/chaincheck`), **`internal/chain`** (abigen bindings for Registry/DemoPool/LanternMarket/MockToken/Reputation, quote digest/sign/verify mirroring `quoteDigest`, `VerifyQuote` = ecrecover + registry ownership (returns the signer), `SettleSwap` = executeSwap tx + receipt), **`internal/solver`** (DFS route search + grid split allocation + runner that answers hub intents with signed quotes), **`internal/protocol`** (quote lifecycle hub + raw-WS handler: intent/quote/retract/pick/subscribe_intents frames; signed retractions EIP-191 `lantern:retract:`, connection-bound pick, `WS_ALLOWED_ORIGINS` origin policy), **`internal/api`** (gqlgen `/graphql` on `:8082` — agents/agent/attestations/pools/trades, + `Agent.canonicalTokenId` from the dual-registration mapping), **`internal/paywall` + `internal/graphfeed`** (x402 v2 402 challenge → PayAI `/settle` → serve `GET /graph/snapshot`; open while `X402_ASSET`/`X402_PAY_TO`/`X402_AMOUNT` unset).   `cmd/market` wires ingest + consistency + quote WS (`MARKET_WS_ADDR`, default `:8081`, **also served as `WS /quotes` on the API port** via a `quoteGate` — 503 until the hub is up; single-port PaaS hosts need only one public port) + reference solver (enabled only when `REFERENCE_SOLVER_KEY`/`REFERENCE_SOLVER_AGENT_ID` set) + web API/graph feed (`API_ADDR`, default `:8082`, **falls back to PaaS-injected `PORT`** when unset). `go test ./...` (+ `-race`) green. **Phase 2 on-chain e2e PASSED on live Fuji 2026-11-15** — `go run ./cmd/e2e` (from `services/market/`): intent → quote → pick → `executeSwap` (block 61126719) → `TradeSettled` + SWAP/SUCCESS attestation verified in the receipt, fee = 20 bps. **Live feed verified 2026-11-16** — local `envio dev` fully indexed (15 agents / 122 attestations / 9 pools), ingest replays them, 30s `consistency: ok` on all 9 pools vs chain. **Phase 4 M1 done 2026-11-17** — `internal/marketdata` display feed: Hyperliquid WS (`allMids` + candle, boot via `/info` `candleSnapshot`/`metaAndAssetCtxs`) + real-DEX V2 poller boot-verified on publicnode RPCs (6 pools: Ethereum WBTC/WETH/USDC, BSC BTCB/WBNB/USDT), `GET /market/{prices,graph,candles}` on `:8082` (CORS `*`, no-store), config `services/market/marketdata.json` + key `MARKETDATA_FILE` (missing file = feed off, never kills the service). Stables have no HL mid — FE values USDC/USDT at $1 peg.
* **Web** (`apps/web`): frontend push **merged 2026-11-16** (`56ad9eb`); **Phase 4 M3+M4 done 2026-11-17**; **`/app` built 2026-11-18** — agent-network showcase: the official Earth globe displays up to ten ranked solvers with amber flight paths and pin-anchored IDs. Development defaults to fictional solvers. Production opens live data. **Brand relabel 2026-11-18** (owner): display/docs "Lantern"/"Lattern"/"LATTERN" → **"Lantern Finance" / "LANTERN FINANCE"** — package names (`@lantern/*`), contract `LanternMarket`, env `LANTERN_*`, file paths (`lattern.css`, `lattern/`), and identifiers (`LatternMark`, `LATTERN_SCENES`) unchanged. **`/exchange` is live-data:** Hyperliquid chart/header/fiat via `GET /market/*` (per-period react-query polls; periods 5m/1H/1D/1W/1M are **native HL candle sizes** (72/72/72/24/12 closed bars + the forming bar → limits 73/73/73/25/13, served by `candleSpecs`), no synthetic candles; live candles glide between polls), quote-protocol WS client (`src/libs/market/quote-ws.ts`: debounced intent → streaming signed solver quotes → bps slippage filter → Select/pick status), Fuji mock-token registry `src/libs/market/tokens.ts` (mUSDC/mUSDT/mWAVAX/mWETH/mWBTC, 18dp, stables $1 peg, majors ← HL coins), Advanced tab = Fuji + display-only real-DEX pools, nav token search switched to Fuji tokens, `mock-data.ts` deleted, `providers.tsx` mounts QueryClientProvider **+ wagmi on Avalanche Fuji** (public RPC default via `NEXT_PUBLIC_FUJI_RPC_URL`, no Monad env gate — wallet button says "Switch to Avalanche Fuji"). Clicking a solver quote opens its **route breakdown** (`src/libs/market/routes.ts` = 9-pool Fuji registry + per-hop token walk, pure/tested; `app/exchange/quote-routes.tsx` = split % → pool chips → next hop; unknown pool/pair renders `?`). **Display = Hyperliquid, execution quotes = Fuji mock pools — HL is never in the execution path.** Tests **122/122**; tsc **23 errors = HEAD baseline (0 new)**; eslint 0 errors (2 pre-existing warnings). Explorer/agent/network/wallet/docs/chat pages still reference removed API/types/config exports (known-broken, fixed piecemeal in Phase 4; do not patch elsewhere). Landing style/vibe/name stay.
* **Gone:** AgentPassport, AgentVault, DemoFXPool + mock tokens, MetaMask Snap (`packages/snap`), OpenRouter chat, Lumen score/risk, quarantined mock data, all FinTechathon hackathon artifacts (docs/08, docs/09, EXECUTION_EVIDENCE, SECURITY, TEST_CASE).

**Missing / next (build plan: `docs/market.md`):** Phase 4 in progress — **M1 (display feed) + M3 (FE wiring) + M4 (live `/exchange`) done 2026-11-17**; next **M2** multi-agent mock solvers (deployer key owns all 15 seeded agents → generalize `solver.Runner` to 4–6 strategy agents), then **M5** `/profile` portfolio, **M6** e2e demo (FE stops at `picked` — on-chain `executeSwap` from the web app needs wagmi Fuji chain wiring). Frontend rebuild continues against `services/market/internal/api/schema.graphqls` + `/market/*` + quote WS (`packages/config` `API_ENDPOINTS` old `/api/*` paths still stale; `DEFAULT_API_URL` now `:8082`). Envio **cloud** deploy: **live 2026-11-19** — `lantern` indexer on `main`/`indexer/` (auto-deploy), Hasura `https://indexer.dev.hyperindex.xyz/ca4e4f0/v1/graphql` (public, no admin secret) → Render `ENVIO_GRAPHQL_URL`; e2e verified: WS 101/403/101, `/graphql` 15 agents + pools. Do not build on deleted code (git history has it if ever needed).

The archived solar preview Sun has a cached amber photosphere, a copper corona, and plasma loops. It scales with camera zoom, and nearby planet labels can move above their planets to clear the solar disk.

**Solver globe** (`/app`): the official view shows an Earth globe that spins on a fixed, tilted north–south axis, with ten ranked solvers, amber flight paths, a cinematic sky, and pin-anchored IDs. Its idle headline flips upward between phrases. `/app2` redirects to `/app`, and the solar system is preserved in `apps/web/src/app/app-solar` with a development-only preview.

The official solver ID is a slate credential with a large teal rank to the left of the name and registry details below. It uses Geist and sizes to its content without internal scrolling. Production `/app` serves pre-rendered standings from the Lantern Go API with 60-second request-driven revalidation. 8004scan is an outbound verification link.

Selecting a solver planet zooms into a viewport-sized close-up below its ID card. Closing the card restores the previous overview zoom.

## Decisions (locked unless owner reopens)

* [2026-09-30] ~~Chain = Monad~~ — **superseded 2026-11-14: chain = Avalanche (Fuji testnet 43113 first, C-Chain later).** Identity stack redeploys to Fuji; Monad testnet deployment is legacy read-only. Identity = ERC-8004 canonical-style registry + ERC-5192 soulbound history (unchanged).
* [2026-10-02] Contracts toolchain = Foundry. Network = testnet first.
* [2026-09-30] Docs are memory: docs/ + code in same commit, `TBD` > invented values.
* [2026-11-14] **Pivot 3:** product = Lantern Finance Graph + Market (Matcha-style aggregation, but solvers are an open network of ERC-8004-identified agents buying the graph and streaming quotes; the user picks). Identity + soulbound track record survive; everything persona/score/demo-protocol related was pruned. **"Arena" naming rejected by owner — use Graph + Market.**
* [2026-11-14] **Market v1 scope locked:** own demo pools first (adapter interface for real DEXs later); settlement on-chain for the **user-picked quote only** (solutions = signed off-chain quotes with deadlines, retractable; no on-chain submission window); one reference solver in the Go service, protocol designed for external solvers from day one.
* [2026-11-14] **x402 = the paywall rail** for Lantern Finance Graph access — **resolved 2026-11-16: PayAI facilitator (`https://facilitator.payai.network`) serves `avalanche-fuji` exact (v1 + v2), verified live via `GET /supported` + the Fuji echo route; payment asset = USDC Fuji `0x5425890298aed601595a70AB815c96711a31Bc65` (6 decimals).**
* [2026-11-14] **Backend = Go** (`services/market/`, separate Go module). Envio stays the indexing layer (Hasura GraphQL subscriptions = realtime feed). Solver transport = raw WebSocket; GraphQL (gqlgen) is frontend-facing only.
* [2026-11-14] Frontend is frozen until its own rebuild session — backend work must not touch `apps/web`.
* [2026-11-15] **8004scan visibility = dual-registration (option 1):** solvers also register on the canonical ERC-8004 Fuji singleton (`IdentityRegistry 0x8004A818BFB912233c491871b3d84c89A494BD9e`, verified live v2.0.0). **Executed 2026-11-18:** all 15 agents registered (`DualRegister.s.sol`, token ids **314–328**), mapping in `contracts/script/seed/dual-registered.json`, served as `Agent.canonicalTokenId`. **URL form (supersedes the original `{chain}/{agentId}` guess): `8004scan.io/agents/{chain-slug}/{canonicalTokenId}`** — slug for Fuji is `avalanche-fuji` (numeric 43113 → "Agent Not Found"), and the id must be the **canonical token id**, not our AgentRegistry id (our id 1 would link to a stranger's agent). **Fuji indexing confirmed live 2026-11-18** (299+ agents; ours indexed with zero lag). Our own AgentRegistry stays the market's ownership source.
* [2026-11-15] **`apps/api` REMOVED (owner reopened the absorption decision):** deleted outright instead of waiting for Phase 4 — the frontend is being rebuilt concurrently and must not code against the old Express routes. Backend = `services/market/` (Go) only; identity reads landed in the gqlgen API (built 2026-11-16). `packages/config` `API_ENDPOINTS` old `/api/*` paths are stale leftovers (frozen web still imports them); `DEFAULT_API_URL` now `:8082` + `MARKET_ENDPOINTS` added (M3, 2026-11-17).

## TBD / blocked (owner to answer when ready)

* Whether attestation `ActionType` enum (`STAKE/UNSTAKE/HARVEST/SWAP`) gets reworked for settlement outcomes (contract change → redeploy + reindex; v1 reuses SWAP).
* Avalanche C-Chain mainnet switch (post-Fuji). Envio cloud deploy (`ENVIO_API_TOKEN` — local `envio dev` works; cloud = CI/headless).
* Enabling the x402 paywall in production: owner sets `X402_ASSET`/`X402_PAY_TO`/`X402_AMOUNT` in `.env` (feed serves open until then); buyer-side payment client (wallet signs EIP-3009) is built with the frontend/solver clients.

* [2026-11-14] **Market parameters locked (owner):** solver fee 20 bps, quote TTL ~45s (off-chain guidance; contract enforces `deadline` only), v1 `executeSwap` submitter = user wallet, failures mint nothing. Demo pool topology: 5 tokens / 9 pools (`script/seed/market.json`).

**Solver globe backdrop (2026-11-20):** Distant shooting particles, star flares, drifting dust and orbiting amber streams animate on the globe's existing clock. Pause freezes the sky, and reduced-motion mode uses the cached backdrop.

The cached sky has layered gas clouds, a darker exposure behind the title, and a larger black hole with a directional copper rim.

## Log (newest on top; older entries were pruned)
* 2026-11-20: Removed the live globe’s demo entry link and the registry-offline message.

* `2026-11-20` — agent: **landing story rewritten to the Graph + Market** — same 12 chapter slots/ids (3D + anchors untouched), new kickers/titles/copy/aside for the current product; `reference-details.tsx` widgets replaced (graph snapshot card, attestation list, intent `mUSDC → mWAVAX` with deadline/signer/reserve checks, six-step intent→quote→pick→settle→fee→attestation flow, stack list ends Avalanche Fuji); finale CTA now `Enter the market` → `/exchange` and `Contracts` → Snowtrace LanternMarket; layout metadata description updated. Finale fixed to a centred rail (`chapter-aside` had lost `margin-inline: auto` to a later rule; CTA + `finale-link` mono links now share one axis/height, no inline `small` sublabels). Verified: web tests 148/148, eslint 0 on touched files, tsc 13 errors (all legacy agent/network/explorer files, 0 from landing), `/` 200 with no Monad/lumen/DemoFX/score copy.

* 2026-11-20: Removed the demo preview sentence from the App globe introduction.

* 2026-11-20: Split the latest App changes into commits for black-hole effects, solver cards, and globe holograms. All 148 web tests passed.

* 2026-11-20: Globe podium holograms stand upright with transparent faces and layered outlines.

* 2026-11-20: Clicking or tapping outside an open solver ID dismisses it. Selecting another solver switches cards.

* 2026-11-20: Globe podium badges use thicker ridged medallions with raised rank emblems.

* 2026-11-20: Fixed podium holograms 34px above their globe pins so the beams keep their length during rotation.

* 2026-11-20: Removed the three rank shortcut buttons below the globe. On-globe badges still open solver IDs.

* 2026-11-20: Globe podium badges sit tighter to the rim with tilted, layered medallion faces.

* 2026-11-20 - Podium emblems project above the globe silhouette with a colored beam anchored to each visible solver.

* 2026-11-20 - Replaced numbered podium pins and shortcuts with crown, gem, and star emblems. Their card seals now use distinct ornamental frames and an iridescent finish.

* 2026-11-20 - Podium card stamps use holographic scan lines, glowing artwork, and a light sweep when reduced motion is off.

* 2026-11-20 - Lowered the solver card stamp by 4px within the existing identity row.

* 2026-11-20 - Added numbered podium pins and fixed top-three shortcuts to the globe. All ten card ranks now have distinct stamp colors.

* 2026-11-20 - Soft-gradient polar jets now fire after the debris and charge glow clear.

* 2026-11-20 - Centered the solver stamp in the rank row and added eight rank-based illustrations, including larger gold, silver, and bronze seals for the first three.

* 2026-11-20 - Black-hole debris gathers before both polar jets fire in a fast, smooth burst without center streaks.

* 2026-11-20 - Replaced solver badge labels with round illustrated stamps. Fuji uses a mountain, ERC-8004 uses an identity shield, and Demo uses a ringed planet.

* 2026-11-20 - The black-hole click now pulls glowing debris inward and fires two polar jets behind the solver globe.

* 2026-11-20 - The globe ID card shows Fuji and canonical ERC-8004 badges at the right of the rank row. Fictional solver cards show a Demo badge.

* 2026-11-20 - Grouped the solver globe, archived solar preview, text motion, and design tooling for frontend-Tai. Web tests: 148 passed. Typecheck still reports legacy agent/explorer errors.

- 2026-11-20: Updated the App card button label to flip one full word at a time.

* 2026-11-20 — Clicking the black hole on `/app` sends fading amber ripples behind the globe, with motion suppressed for reduced-motion users.

- 2026-11-20: Reduced the App card button text reveal to one flip per character.

- 2026-11-20: Restored the footer animation effect's cleanup and verified that the edited TSX files parse.

- 2026-11-20: Applied staggered flips through two intermediate letters to the card footer label and kept the headline's whole-phrase animation.

- 2026-11-20: Kept the App headline visible and cycling independently of agent card selection.

- 2026-11-20: Added a hover label reveal to the demo card action so it changes from View live agents to Open live roster.

- 2026-11-20: Clipped the App footer glow to the button shape and added a lit label reveal for the 8004scan action.

- 2026-11-20: Added a separate gold light pulse that follows the footer stroke and fades into the arrowhead.

- 2026-11-20: Shortened the footer glide to 420ms and debounced hover and focus changes by 200ms to prevent rapid animation reversals.

- 2026-11-20: Added a warm light trail that follows the App footer's gold line as it forms the arrow.

- 2026-11-20: Replaced the App footer arrow's spin with a slower glide that stretches and blurs before the arrow settles.

- 2026-11-20: Updated the card action so the gold edge splits, spins during travel, forms the arrowhead, and then grows the shaft.

- 2026-11-20: Added ease-in-out timing and a brief blur to the App footer's gold line-to-arrow morph.

- 2026-11-20: Matched the footer hover arrow to the earlier open-arrow style while retaining the gold-line morph.

- 2026-11-20: Replaced the App footer's static arrow with a gold edge that moves right and morphs into an arrow on hover or keyboard focus.

- 2026-11-20: Stretched the App card action across its footer row with the label on the left and arrow on the right.

- 2026-11-20: Restyled the App footer action with a charcoal cut corner and a copper edge.

- 2026-11-20: Restyled the right-aligned App footer action in dark teal, with its label to the right of the animated arrow.

- 2026-11-20: Anchored the App card footer link and its hit area to the right edge.

- 2026-11-20: Aligned the App card footer label next to its arrow on the right, removed the divider, and limited hover animation to the arrow.

- 2026-11-20: Changed the App solver card action to a full-width footer link with a divider and copper arrow.

- 2026-11-20: Restyled the App card action as an ivory pill with a charcoal arrow circle.

- 2026-11-20: Moved the App card footer action down by 20% of its previous bottom gap and added a copper-accented arrow treatment.

- 2026-11-20: Simplified App card details to Attestations above Owner and the canonical Registered ID.

- 2026-11-20: Reduced the solver card footer gap by 10%, from 40px to 36px on desktop.

- 2026-11-20: Used the screenshot's white measurement mark as the reference for the solver card footer gap, setting it to 40px on desktop.

- 2026-11-20: Matched the solver card's top inset above the agent name with the bottom inset below the 8004scan button at all breakpoints.

- 2026-11-20: Increased the padding below the App ID card's footer button and restored the prior globe positioning.

- 2026-11-20: Increased selected-agent zoom by 10%. Live App cards fall back to the recorded Fuji seed description on RPC failure, and demo cards identify fictional solvers.

- 2026-11-20: Agent selection pans the globe and ID card upward together by up to 25% of the stage height, using the original leader spacing and keeping the card within the stage where space permits.

- 2026-11-20: Changed the App solver ID card to dark gray glass and raised it above the selected marker with a longer leader.

- 2026-11-20: Switched the official App solver ID card to a flat translucent tint with a blurred backdrop.

- 2026-11-20: Verified the App card changes with the web test suite and restricted TextMorph's wrapper to its supported tags to resolve its JSX type error. Legacy explorer types still block full web typecheck.

- 2026-11-20: Refined the App ID card and added decoded ERC-8004 About text via the existing server-rendered standings.

* 2026-11-20 - Moved official globe standings to server-side rendering with 60-second ISR. The browser receives up to ten ranked records and the existing demo URLs still resolve.

* 2026-11-20 - Switched the globe credential to Geist and removed excess vertical spacing.

* 2026-11-20 - Simplified the globe credential typography, registry details, and footer action.

* 2026-11-20 - Moved solver rank and name into a two-column identity row above the registry details.

* 2026-11-20 — Solver ID footer links to the canonical Fuji profile on `testnet.8004scan.io`; sample IDs link to the live roster.

* 2026-11-20 - Redesigned the /app solver ID as a taller, minimal credential with responsive, scroll-free details.

### 2026-11-20 - Heavier App globe spin
Reduced drag sensitivity and flick speed, smoothed momentum buildup, and lengthened the fixed-axis coast on `/app`.

* 2026-11-20 - Hid the /app solver ID scrollbar during the reveal and retained scrolling for cards that exceed the available height.

* 2026-11-20 - Locked /app globe rotation to a fixed axis for drag, keyboard, and solver focus.

* 2026-11-20 - Promoted the Earth globe to /app, redirected /app2, and archived the solar system at the development-only /app-solar preview.

* 2026-11-20 - Changed the /app2 headline to a bottom-up flip between phrases.

* 2026-11-20 - Restored the Earth globe at /app2 using the existing globe renderer, shared solver feed and identity card, and a reconstructed accretion disk.

* 2026-11-20 - Added animated planet close-ups on /app, with immediate focus for reduced motion and overview restoration on dismissal.

* 2026-11-20 - Refined the /app Sun with a textured amber photosphere, a darkened limb, and a copper corona with plasma loops.

* 2026-11-20 - Fixed the planets in place on matching spaced tracks and added manual camera orbit.

* 2026-11-20 - Preserved relative orbital rates with one accelerated clock, lowered the view to 15 degrees, and refined the planet textures and rings.

* 2026-11-20 - Added perspective depth, accelerated orbital motion, and more visible axial rotation to the /app solar map.

* 2026-11-20 - Added rotating Three.js planets, a flat XY orbit plane viewed from 45 degrees toward +Z, and fading dashed signal trails on /app.

* 2026-11-20 - Set the /app solar map camera to 45 degrees above the orbital plane.

* 2026-11-20 - Matched the proportions and sweep direction of the planet-to-planet paths on /app.

* 2026-11-20 - Removed the black hole and accretion disk from /app and matched planet surfaces to Lantern Finance's black-and-gold palette.

* 2026-11-20 - Replaced the /app Earth globe with a solar map using JPL approximate positions, bounded pan, axial planet rotation, and elliptical links between solver-labeled planets.

### 2026-11-20 - App globe satellites
- Removed decorative satellites and their canvas render pass.

### 2026-11-20 - App headline letter morph
- Shared letters slide into position and new letters fade in on the existing three-second cycle. TextMorph uses browser animations while npm is unreachable.

### 2026-11-20 - App HyperText headline
- App phrases now resolve letter by letter every three seconds. The reusable component runs with React and CSS because the npm registry was unreachable.

### 2026-11-20 - App headline focus pull
- Each phrase softens out and the next resolves into focus in the same position. The three-second cadence and reduced-motion fallback are retained.

### 2026-11-20 - App headline wipe
- The App headline switches phrases with a left-to-right wipe on the existing three-second cadence.

### 2026-11-20 - App headline rotation
- The full App headline cycles through three phrases at the Exchange's three-second cadence, with a fixed text area and a static title for reduced motion.

* **2026-11-20 App**: removed the buttons below the solver globe. Drag rotation and wheel zoom remain.

### 2026-11-20 - App title idle motion
- The solver network title catches a soft warm light at idle. Opening a solver card, pausing ambient motion, or enabling reduced motion keeps it still.

- 2026-11-20: Matched the App's shooting particles to the Exchange backdrop with faint, short trails on small curved paths.

- 2026-11-20: Added depth to the App sky with layered gas clouds, a directional lensed rim and slower disk motion.

- 2026-11-20: Added shooting stars, brighter star flares and drifting dust to the App sky.

- 2026-11-20: Animated the App backdrop with star twinkles and glowing streams across the accretion disk.

- 2026-11-19: Reframed the solver page as an orbital observation field with high-DPI procedural sky, finer land sampling and directional brass lighting.

- 2026-11-19: Solver globe gained bounded zoom, an eclipsed amber disk and an animated registry card anchored above the selected dot.

* `2026-11-19` - Styled App satellites with brass lantern bodies and charcoal wings, and layered the aurora behind the globe.

* `2026-11-19` - Replaced orbiting solver labels with decorative satellites and added a surface light wave and muted aurora.

* `2026-11-19` - Removed the visible orbit line from the App globe. Agent labels still move around it.

* `2026-11-19` - Restyled the globe hologram as a Lantern Finance solver ID, with labeled sample credentials and the live verification link.

* `2026-11-19` - Fit the App globe and controls within the viewport and removed page scrolling.

* `2026-11-19` - Smoothed App globe dragging and lengthened momentum decay to match the feel of page scrolling.

* `2026-11-19` - Expanded the App globe to ten agents and moved detail cards onto the globe. Removed the side panel.

* `2026-11-19` - App solver selection pushes the globe camera toward the selected dot and reveals a holographic inspector. Globe halo and marker bloom removed.

* `2026-11-19` - The local development App opens with five fictional solvers by default. View live network switches to real standings. Production defaults to live data.

* `2026-11-19` - Added an eased idle spin, drag momentum, and orbiting attestation labels to the App globe. Open `/app?demo=1` for five fictional solvers without a registry connection. Verified the desktop preview, dot selection, standings, and pause/resume in Edge.

* `2026-11-19` - Replaced the flat App map with a cinematic interactive globe and five live-ranked solver dots. Added animated illustrative arcs, pause and reduced-motion handling, and a registry inspector with 8004scan links. Web tests and touched-file lint passed. Local browser preview timed out.

* `2026-11-19` - Confirmed the Windows frontend startup command `pnpm.cmd dev:web` from the repository root.

* `2026-11-19` - Created a standalone Solver Constellation showcase with five selectable beacons, attestation-based heights and reduced-motion support. Node interaction and coordinate checks passed. Browser visual check pending.

* `2026-11-19` - Standalone App design preview compares Spotlight and Rank board for five sample solvers, ranked by earned attestations. Node interaction checks passed. Browser layout and shared navigation integration remain unverified.

* `2026-11-19` — agent: **prod FE pointed at localhost — `packages/config` env reads were dynamic, Next never inlined them** — `globalThis.process?.env?.NEXT_PUBLIC_*` (and any non-static access) skips build-time replacement, so Vercel always fell back to `DEFAULT_API_URL=localhost` despite correct Config keys; fixed all four getters to static `process.env.NEXT_PUBLIC_*` (+ `@types/node` in `@lantern/config`, `apps/web/.env` stale `:4000`→`:8082`), canary build proved inlining, pushed `e806891`, deployed bundle verified: `https://lantern-2ikh.onrender.com` + `wss://…/quotes` inlined, zero localhost. Also: local `:8082` market service had died mid-session (restart from `services/market` CWD, pid `/tmp/lantern-market.pid`) — localhost page errors were just the dead backend, FE paths (`/graphql`, `/market/*`) were correct.

* `2026-11-19` — agent: **$0 stack e2e verified green — deployment complete** — Render env pastes by owner (`WS_ALLOWED_ORIGINS` no-slash + `ENVIO_GRAPHQL_URL` cloud Hasura) landed; live checks: quote WS with Vercel origin **101** / evil **403** / solver no-origin **101**, `/graphql` returns **15 agents + pools** (cloud Hasura, synced 100% @ block 61331594), healthz + Vercel 200. Deployables: `lantern-five-virid.vercel.app` (FE) → `lantern-2ikh.onrender.com` (Go, single port) → `indexer.dev.hyperindex.xyz/ca4e4f0/v1/graphql` (Envio Cloud). Demo caveats: Render 15-min sleep (~1-min wake), Envio free tier deletes ≤30-day deployments (redeploy via `envio-cloud` + push webhook).

* `2026-11-19` — agent: **$0 deploy stack live (Render + Vercel) + Envio Cloud deploy wired** — owner accepted sleep/wake demos: Render Free web service **`lantern-2ikh.onrender.com`** (root dir `services/market`, `go build -o market ./cmd/market`, Free plan, `/healthz` → 200 live) + Vercel FE (exactly 2 env keys as **Config**, not Secret: `NEXT_PUBLIC_API_URL` origin + `NEXT_PUBLIC_QUOTE_WS_URL` wss `…/quotes`; the other 8 legacy keys deleted). `b844313` unblocked the Vercel build: dead `getMonadExplorerUrl`/`buildExplorerPassportUrl` imports → `getExplorerUrl`/removed Monadscan links, `next.config` `ignoreBuildErrors` for the frozen-FE tsc baseline (13 < old 23). **`WS_ALLOWED_ORIGINS` trailing-slash bug found pre-prod**: Origin is `scheme://host`, `path.Match` rejects `…app/` — fixed in `.env`/`.env.example`, verified correct origin **101** / evil **403** / solver no-origin **101**; Render env must carry the no-slash form too. Root `.env`: 12 dead keys (OpenRouter chat, vault, DemoFX mocks, DATA_SOURCE) archived under a keep-for-revival comment. **Envio Cloud**: `envio-cloud` CLI session (GitHub auth — `ENVIO_API_TOKEN` is NOT CLI login, and is platform-injected on cloud, not settable); legacy `lantern` indexer re-pointed `--branch main --root-dir indexer --config-file config.yaml --auto-deploy`, `ENVIO_AVAX_FUJI_RPC_URL` set; commits list populates only on push webhook → deploy fires from this commit.

* `2026-11-19` — agent: **free-tier deploy readiness — single-port `/quotes` + `PORT` fallback + `docs/deploy.md`** — owner accepted sleep/wake for demos (mock pools, WS may die between visits): $0 stack = Vercel (FE) + Render Free (Go, 15-min spin-down, ~1-min wake, 750 h/mo) + Envio Cloud free Development plan (indexer, ≤30-day redeploy). `cmd/market`: new `quoteGate` mounts the quote-WS handler on the `API_ADDR` mux at `/quotes` (503 until the hub is up / when disabled; `:8081` listener kept for the local default URL) so one public port serves `/graphql` + `/quotes` + `/market/*` + `/healthz`; config: `API_ADDR` falls back to PaaS-injected `PORT` (colon-form normalized, explicit `API_ADDR` wins). Docs: new `docs/deploy.md` (stack, env checklists, wake behavior, upgrade path) + doc-map row in AGENTS.md, `.env.example` + `docs/api.md` port notes. Verified: `go test -race ./...` green (+ new gate + PORT tests), live smoke: `healthz`/`graphql` 200, `:8082/quotes` WS upgrade → **101** (plain GET → 426), `:8081/quotes` unchanged.

* `2026-11-18` — agent: **dual-registration executed — all 15 agents live on 8004scan** — new `contracts/script/DualRegister.s.sol` (+10 tests, forge **103/103**): registers every seeded agent on the canonical Fuji ERC-8004 singleton with an EIP-8004 registration file as a base64 `data:` URI (neutral description + our AgentRegistry id/address — seed bios carry stale pre-pivot Monad copy and stay local), guards seed↔registry URI match + an orphan guard (canonical tokens without a mapping file → revert), idempotent skip of mapped ids, writes `script/seed/dual-registered.json`. Broadcast: **token ids 314–328** (307–313 were taken by others meanwhile — ids are recorded, never assumed), owner = deployer, tokenURIs decode correctly, **8004scan indexed all 15 with zero lag** (`8004scan.io/agents/avalanche-fuji/{314..328}` → 200 + correct names). FE contract: gqlgen `Agent.canonicalTokenId` (nullable) — `internal/api/dualreg.go` loader (`DUAL_REGISTRATION_FILE`, default `../../contracts/script/seed/dual-registered.json`; missing = null, malformed = fatal), stamped in `HasuraSource` beside `fillAgentIDs`; gqlgen regen via `go run github.com/99designs/gqlgen@v0.17.98 generate` (versioned tool run — plain `go run` lacks go.sum entries; the trades-limit consts moved to `resolver.go` because gqlgen shuffles unknown consts out of `schema.resolvers.go`). FE: `build8004scanAgentUrl(canonicalTokenId)` → slug URL, `agentVerifyUrl()` (null → button hidden, never links a stranger's token), query + `toAgentRecord` pass the field. Gotcha fixed: default mapping path needed **two** `../` (services/market → repo root). Verified: forge 103/103, `go test ./...` + vet + gofmt green, web **145/145** (+1), tsc 23 = baseline (0 new), eslint clean on touched files, live graphql query returns 15/15 canonical ids, 8004scan 15/15 pages.

* `2026-11-18` — agent: **`/app` agent-network showcase + brand relabel** — `/app` is its own route: header + **Global host map** (react-simple-maps `geoEqualEarth`, `/maps/land-110m.json`, deterministic illustrative pins — never presented as geolocation) + **Standing board** (gqlgen `agents`, react-query 15s, ranked by earned attestations then id — no derived score/risk) + per-card **Verify on 8004scan** (`8004scan.io/agents/43113/{id}`, 44px target). Pure helpers `src/libs/app/{network,graphql}.ts`, map `ssr:false`, 7 unit tests. Brand relabel (owner: display only): "Lantern"/"Lattern"/"LATTERN" → "Lantern Finance"/"LANTERN FINANCE" across UI copy, titles, README/docs; identifiers (`@lantern/*`, `LanternMarket`, `LANTERN_*`, `lattern.css`, `LATTERN_SCENES`) untouched. Placement notes in `docs/frontend.md` §App network showcase. Verified: app-network 7/7, web suite green, tsc 23 = baseline (0 new), packages tsc clean, eslint 2 errors pre-existing at HEAD, `/app` SSR 200.

* `2026-11-18` — agent: **quote route breakdown + wallet chain = Avalanche Fuji** — `/exchange` quote rows are now disclosure buttons (`aria-expanded`, 44px target); opening one renders the agent's split per path and every hop (`62.5% → mUSDC / mWAVAX 0x2300…5ca0 (62.5% of input) → mWAVAX → …`). Derivation is pure in `src/libs/market/routes.ts` with the 9 Fuji DemoPools seeded from the deploy broadcast; unknown pool or non-matching pair shows `?`, never a guessed symbol. Chain: `providers.tsx` config + wallet button → `avalancheFuji` ("Switch to Avalanche Fuji"), Monad RPC env gate + configure-notice dialog removed (public Fuji RPC default), exchange `rpcConfigured` gate dropped, layout metadata says Avalanche Fuji. Verified: web 130/130 (6 new route tests), eslint 0 on touched files, tsc 23 = baseline (all legacy pages), `/exchange` SSR 200. Remaining Monad copy: `app/{agent,network,docs,wallet}` pages + `vault-panel`/`swap-demo-panel` + lattern marketing scenes (known-broken legacy, Phase 4).

* `2026-11-18` — agent: **HL WS liveness guard (feed froze while "connected")** — live symptom: prices + candles stopped at 18:17Z yet no reconnect was logged; `conn.Read` sat forever on a half-open socket (no pings were ever sent). Fix in `hyperliquid.go`: pinger writes `{"method":"ping"}` every 30s, each `Read` runs under a 90s deadline, and `pong`/`stale` frames are handled → the loop errors and `Run` redials. Tests: silent peer forces a stale error + proves the ping was sent; pong replies keep the socket fresh. Verified live after restart: 5m forming bar updated 20× in 30s (~1.1–3s gaps) with volume growing, no ws errors; `allMids` stays ~12s (HL throttle) — the candle stream is the live one.
* `2026-11-18` — agent: **chart edge candles** — chart x positions are band centers (`20 + (i + 0.5)/n × 600`) for line points, candle bodies and volume bars, so the first/last candles render at full width instead of being half-clipped by the plot's `x=20 width=600` clip rect; the chart test pins the inset. Verified: web chart/axis tests 9/9, tsc 23 = baseline.
* `2026-11-18` — agent: **chart timeframes = native HL candle sizes (replaces the synthetic 15s stream)** — FE `chart-data`: `TIMEFRAMES` maps each button to a real HL interval (5m/1h/1d/1w/1M) with 72/72/72/24/12 closed bars **+ the forming bar** (limits 73/73/73/25/13), per-period poll cadence, display candles 1:1 with feed candles (bucketing removed, `All` removed); `interpolateCandles` glides ticks; `market-chart` glides over 600ms (morph only on period/style), no pointer crosshair, volume `—` when absent, header names the feed. Backend: **deleted** `tick.go`/`tick_test.go` (`TickAggregator`) and the `candleInterval`/`candleHistory`/`candleHistoryMinutes` config knobs; `candleSpecs` in `service.go` is the one table, boot window = `bars × candleSpan(interval)` + WS candle sub per interval/coin. Fixes the bug where `interval=5m` returned `null` and the 5m view was flat 15s `o=h=l=c` mid bars. Verified: web 124/124, tsc 23 = baseline, `go test ./...` green + vet/gofmt clean, live — 4 coins × 5 intervals booted (5m/1h/1d 73 bars, 1w 25, 1M 13), 5m forming bar h/c/v advanced between polls, no WS errors.

* `2026-11-17` — agent: **5m demo timeframe** — FE: `chartPeriods` = ["1H","5m","1D","1W","1M","All"], 5m → `chartIntervalFor` = `5m`, limit 60 (60 × 5m = 5h window, same 60-candle shape as 1H); backend: +spec {5m × candleHistory5m} (config key, minutes, default 720, ≥300), `marketdata.json` = 720. Same 5s snap as every other frame — the forming 5m candle jumps each poll. Verified: web 124/124, eslint 0, tsc 23 = baseline, gofmt/vet clean + `go test -count=1` green, live — boot 145 × 5m/coin, `interval=5m&limit=60` returns 60 and last candle OHLC changes between 6s polls, SSR shows the 5m button.
* `2026-11-17` — agent: **1H demo timeframe — 1m candle stream** — FE: `chartPeriods` = ["1H","1D","1W","1M","All"] with `chartIntervalFor()` (1H → `1m`, rest → `1h`), 1H limit 60, **default period = 1H** so the page opens on the live-jumping chart; backend: `HL` now takes `[]candleSpec{interval, history}` (boot snapshot + WS candle subs per spec), config +`candleHistoryMinutes` (default 120, ≥60), service wires {cfg interval × candleHistory hours, "1m" × candleHistoryMinutes}, `marketdata.json` sets 120. Store/http already keyed by interval — no change. Verified: web 124/124, eslint 0 errors, tsc 23 = baseline, `go test -count=1 ./...` green + vet/gofmt clean, live — `interval=1m&limit=60` returns 60 and the last candle's OHLC changes between 6s polls (ETH `l 1810.1→1809.5`), 1h feed unaffected.
* `2026-11-17` — agent: **M4 polish — chart follows selection, clean symbols, 2× candles, no per-tick wipe** — chart token = last picker selection (`chartSymbol` state) instead of pinned to the buy token; chart header/aria/switch label use `displaySymbol()` (ETH/BTC/AVAX/USDC/USDT — no m-prefix/mock names on the chart; swap panel keeps Fuji tickers); `PERIOD_LIMITS` doubled 48/336/1440/4000, display buckets 48→96; frame swaps in place on live ticks (morph animation only on period/style change) so the last candle updates instead of the chart wiping; **animation restore**: morph retriggered on style change too (`plotStyle` flips old→new as growth starts — line retracts, candles grow), direct-swap gated on `nearSame` lengths + no morph in flight (fast local data arrival no longer kills the period morph); **overlap fix**: candle body width scales with bucket count (`600/count × 0.72`, cap 14) and volume bar width with raw count (cap 6) — 48-candle 1D bodies 9 wide, no more overlapping; backend `candleHistory` 168→1440 (60d boot per coin) + `/market/candles` limit cap 2000→4000. Display coverage = mock set (BTC/ETH/AVAX stream from HL, USDC/USDT at $1 peg). Verified: web tests 124/124, eslint 0 errors, tsc 23 = HEAD baseline, `go test ./...` green, live smoke — 336/1441 candles served, `limit=4001` → new `[1,4000]` error, SSR 200 with chart markup.
* `2026-11-17` — agent: **Phase 4 M3+M4 — FE wiring + live `/exchange`** — config: `packages/config` `DEFAULT_API_URL/PORT` → `:8082` + `MARKET_ENDPOINTS`/`getMarketApiBaseUrl`/`DEFAULT_QUOTE_WS_URL`/`getQuoteWsUrl`; `.env.example` keys. FE: `src/libs/market/{tokens,api,quote-ws}.ts` (Fuji 5-token registry 18dp + $1 peg/HL coin valuation, `/market/*` fetchers, quote-WS client with pure `applyQuoteFrame` reducer + integer-bps `quoteMeetsSlippage`), hooks `use-market` (react-query 2s/5s) + `use-quote-stream` (350ms debounced intent, 3s reconnect), `providers.tsx` always mounts QueryClientProvider; `/exchange` rebuilt — live HL chart (1D/1W/1M/All on 1h candles, real OHLCV/volume/timestamps), streaming signed solver quotes → Select → picked status, Advanced = Fuji + display-only real-DEX pools, nav search → Fuji tokens, `mock-data.ts` deleted; `site-navigation` lint fix (setHidden deferred). Gotchas: ES2017 → no BigInt literals in src; tsc baseline is **23** (MEMORY previously said 25); dust `amountIn` (100 wei) rounds output to 0 → silent no-quote, FE sends base units. Verified: web tests 122/122, eslint 0 errors, tsc = 23 = HEAD baseline (0 new), `/exchange` SSR 200, live WS intent→quote(agent 1)→pick→closed round-trip.
* `2026-11-17` — agent: **Phase 4 M1 — display feed `internal/marketdata`** — Hyperliquid WS (`allMids` + candle; boot `/info` `candleSnapshot` + `metaAndAssetCtxs` → `markPx`) + real-DEX V2 poller (boot-verified `getPair`/`symbol`/`decimals`/`token0` on ethereum/bsc publicnode; 6 pools), `GET /market/{prices,graph,candles}` on `:8082`, config `marketdata.json` + `MARKETDATA_FILE` (missing file = feed off). Live fixes: HL meta shape is `{"universe":[…]}`+parallel ctxs; Go json `t`/`T` key collision needed distinct fields (candle open times); token0 compare case-insensitive; boot mids filtered to configured coins; no HL stable mid → FE uses $1 peg. Verified: `go test ./... -race` + vet + gofmt; live smoke — 4 coins, reserves moving, candles hour-aligned, 23 WS reconnects self-healed over ~18h.

* `2026-11-16` — agent: **merged `origin/frontend-Tai` (`56ad9eb`)** — FE push (59 files): `/exchange`, `/profile`, `/app`, navigation, loading states, design notes + 6 tests. Conflicts resolved: MEMORY = backend truth + 23 FE log entries spliced; `docs/frontend.md` banner + FE notes (AGENTS ref unified); `.gitignore` kept Go ignore; lockfile regenerated. Verified: `pnpm install`, packages tsc, web tests 106/106; web tsc = 25 known old-page errors only (new pages clean).

* `2026-11-16` — agent: **Phase 3 complete — gqlgen API + protocol hardening + x402 paywall** — (1) **`internal/api`** (gqlgen): `schema.graphqls` (`agents`/`agent`/`attestations`/`pools`/`trades`, limit clamp 1–200), `POST|GET /graphql` + `/healthz` on `:8082` (`API_ADDR`), Hasura envelope decoding + nested-attestation `agentId` stamping; (2) **protocol hardening**: signed `Retract` (EIP-191 `lantern:retract:<intent>:<quote>` digest, recovered signer must equal the quote's signer), connection-bound `Pick` (a foreign WS connection cannot pick someone else's intent), WS origin policy (`WS_ALLOWED_ORIGINS`; no-Origin machine clients unaffected), `chain.VerifyQuote` now returns the signer; (3) **x402**: `internal/paywall` (v2 `PAYMENT-REQUIRED` challenge, settle-only via PayAI `POST /settle`, `PAYMENT-RESPONSE` header, CORS preflight unpaid, 503 when facilitator down) + `internal/graphfeed` (`GET /graph/snapshot` → sorted pool JSON, decimal-string reserves) + config `X402_FACILITATOR_URL`/`X402_NETWORK`/`X402_ASSET`/`X402_PAY_TO`/`X402_AMOUNT` (trio all-or-nothing → error, all empty → open feed). Facilitator verified live: `/supported` lists `avalanche-fuji` exact; echo route gave USDC asset `0x542589…1Bc65`. Also this session: stale Passport-era envio stack wiped + fresh `envio dev` (`indexer/.env` created from root token, gitignored), `effects.ts` RPC/Reputation fallbacks fixed, ingest tolerates `ka` before `connection_ack`; **live-feed verification cleared** (9/9 pools `consistency: ok` vs chain). Verified: `go test ./... -race` + vet + gofmt clean; indexer 7/7 + tsc; live smoke — open snapshot serves Fuji pools, gated mode returns the 402 challenge matching PayAI's shape, preflight 204, invalid signature rejected.

* `2026-11-15` — frontend sessions on `frontend-Tai` (merged 2026-11-16; older cinematic-landing history pruned to git):

### 2026-11-16 - Keep first circle-to-lanes motion visible
- Extended circle exit, retained luminous strands through ribbon formation, delayed destination network reveal.
- Updated route tests and frontend notes; layout and shared controls unchanged.

### 2026-11-16 - Restore uninterrupted artwork motion
- Compared frontend-Tai: spatial handoff code unchanged; fixed frame-cache gaps and conflicting per-object clocks.
- Retain last worker pose through delays/revisits; regression test covers eviction, recovery and cleanup.

### 2026-11-16 - Preserve animation slots for disabled chapters
- Remapped visible panel weights and transition IDs to original chapter indices; fixes NaN geometry after disabling Ask Lantern Finance.
- Added regression coverage for finite coordinates/weights through the finale.

### 2026-11-16 - Landing content cleanup
Removed Lotus receipt/count and adjusted research copy; disabled Ask Lantern Finance chapter/demo and its links, retaining code for later. Updated frontend/design notes.

### 2026-11-16 - Landing AVAX logo
- Replaced the Monad centerpiece contours with the Avalanche mark in chapter-transition.ts; animation and placement retained.
- Updated landing design and frontend notes; 106 web tests passed.

### 2026-11-15 - Frontend commit preparation
Added .next-* build-backup ignore rule; staging/commit blocked by permission denial creating .git/index.lock.

### 2026-11-15 - Remove mock quote summary
Removed valid mock quote/minimum-received text beneath the wallet button; empty and insufficient-balance feedback retained.

### 2026-11-15 - Headline interval
Exchange headline rotation increased from 2 to 3 seconds; frontend notes and current state updated.

### 2026-11-15 - Match Swap and chart heights
Swap mode restores the chart-responsive minimum height through a scoped data-mode selector; other modes retain content sizing. Frontend notes updated; browser QA pending.


### 2026-11-15 - Swap mode rounding
Matched mode highlight radius to the swap panel's 24px; frontend notes updated. Browser visual QA pending.

### 2026-11-15 - Smoother landing header motion
Coalesced scroll work, cached header height and limited React updates; eased transform with jitter filtering and cleanup.
Frontend notes updated; browser performance QA pending.

### 2026-11-15 - Profile chart spacing
Reduced wallet toolbar bottom margin to 32px desktop/tablet and 20px phone; frontend notes updated.

### 2026-11-15 - Hide landing header on downward scroll
Added direction-aware hide/reveal with an 8px threshold, focus/menu/search protection and reduced-motion support; frontend notes updated.
Browser QA pending.

### 2026-11-15 - Header search color refinement
Matched search background to navigation header; removed wallet blur/fallback. Focus border and positions retained.


### 2026-11-15 - Header search background
Matched token search to wallet glass background/blur and fallback; focus and geometry retained. Frontend notes updated.


### 2026-11-15 — Faster headline rotation
Changed exchange headline interval to two seconds; transition duration and reduced-motion behavior retained.

### 2026-11-15 - Landing sticky navigation
Home header sticks at the viewport top; existing desktop/mobile height and story offsets retained. Frontend placement notes updated.
Verified: 106 web tests passed; direct TypeScript check passed. Browser QA pending; git unavailable in this copy.

### 2026-11-15 — Rotating exchange headline
Added four short headline pairs, two-second rotation and eased fade/rise; reserved height keeps panels stable.
Reduced motion shows original copy; hidden tabs skip updates and timer cleans up on unmount. Frontend notes updated; browser QA pending.

### 2026-11-15 — Direction icons and decrease preview
Replaced text arrows with consistent SVG icons and accessible direction labels; MON 1D mock now decreases 4.82%.
Updated frontend notes and fixture regression check; controls unchanged, browser visual QA pending.

- 2026-11-15: Removed Profile MOCK DATA badge beside wallet identity; preview disclosure retained. Typecheck/tests blocked by broken pnpm executable; git history unavailable (no .git directory).

### 2026-11-15 — Larger unsigned chart percentage
Removed positive/negative signs from percentage text and increased it from 12px to 18px; arrows, trend colors and animation retained.
Frontend placement notes updated; browser visual QA pending.

### 2026-11-15 - Larger chart time labels
Increased Exchange horizontal-axis labels to 12px. Existing placement research reviewed; same anchors, mobile label thinning and control reach. CSS verified; browser QA pending.


### 2026-11-15 — Continuous chart stroke
Removed legacy normalized dash drawing from the active chart line; clip-based transitions still animate line and fill together.
Corrects line-only truncation beyond the earlier viewport fix; browser visual QA pending.

### 2026-11-15 — Timeframe pill highlight
Inset the active timeframe highlight vertically while retaining button geometry and gold palette; frontend notes updated.
Existing placement research and user screenshot informed paint-only change; browser visual QA pending.

### 2026-11-15 - Search focus outline correction
Restored original search border and hover/focus colors; removed only offset focus outline per clarification. Existing placement research applies; geometry unchanged.


### 2026-11-15 — Exchange chart endpoint
Matched SVG viewport, time-label insets and pointer mapping to remove the gap before Now; fixture data retained.
Updated frontend placement notes; shared controls unchanged. Git metadata unavailable in this workspace.

### 2026-11-15 - Borderless header search
Removed visible search border across states; retained accessible focus outline and geometry. Existing placement research applies; mobile/desktop reach and scrolling unchanged.


### 2026-11-15 - Translucent navigation
Shared header background reduced to 48% opacity; retained 18px blur with WebKit support. Placement and targets unchanged.

### 2026-11-15 - Profile search spacing
- Reduced asset-tab top padding from 18px desktop/16px mobile to 4px; frontend placement notes updated.
- Verification: profile test passed (1/1); typecheck blocked by broken pnpm launcher/missing root TypeScript; browser QA not run. Git history/status unavailable: workspace has no .git directory.


### 2026-11-15 — Larger exchange chart controls
- Increased chart-style, metric and timeframe buttons to 44px minimum, with larger labels/icons and flush highlights. Frontend placement notes updated.
- Verification: see session handoff; browser visual QA pending.

* `2026-11-15` — agent: **`apps/api` removed (owner)** — Express read layer deleted so the concurrent FE rebuild targets the Go API, not dead routes. Root `package.json` (`dev:api`/`build:api`), `PORT` (.env.example), lockfile (−62 pkgs) cleaned; docs swept (AGENTS stack + test rules, README tree/quick-start/table, GETTING_STARTED, architecture diagram/table, `docs/api.md` → tombstone, market.md refs). Left untouched: `apps/web` (frozen — still has stale `pnpm dev:api` copy) and `packages/config` `API_ENDPOINTS` (FE rebuild rewrites them). Verified: `pnpm install` clean; no `@lantern/api` references left outside frozen web.

* `2026-11-15` — agent: **Phase 2 complete — on-chain e2e PASSED on Fuji** — new `cmd/e2e` (scripted flow: broadcast-seeded graph → in-process hub + reference solver → real WS intent/quote/pick → mint/approve → `SettleSwap` → receipt-log verification of `TradeSettled` + SWAP/SUCCESS attestation; fee = 20 bps exact). Supporting changes: generated `MockToken` + `Reputation` abigen bindings; `SettleSwap` now returns the receipt (verification from `receipt.Logs` — no block-window/RPC-lag races); first verify attempt failed on an `end-20` getLogs window, fixed by parsing the receipt directly. `go run ./cmd/e2e` → `E2E PASS`; `go test ./... -race` green; vet/gofmt clean. `docs/market.md` phases 0–2 marked done.

* `2026-11-15` — agent: **Fuji deployed + indexer config fixed** — contracts live on 43113 (Registry `0x62cd4e0C…a6341`, Reputation `0x5Df5E5FD…40B8`, Market `0xE77719De…f70B`, 5 tokens, 9 pools; 15 agents + 120 attestations seeded; verified `ownerOf`/`getReserves`/FEE_BPS on-chain). `.env` (`AVAX_FUJI_RPC_URL`, `DEPLOYER_PRIVATE_KEY` renamed from `MONAD_PRIVATE_KEY`, addresses, `REFERENCE_SOLVER_*`), `indexer/config.yaml`, README, `docs/contracts.md` filled. Indexer vitest failure root cause: **repeating `- name: DemoPool` 9× breaks simulate routing** (dead-input "unrouted items") — correct shape is one entry with an `address:` YAML **list**; 7/7 green + tsc + codegen clean. Remaining: live Phase 2 e2e, `ENVIO_API_TOKEN` cloud deploy.

* `2026-11-15` — agent: **Phase 2 off-chain half — quote flow code complete** (`services/market/`): `internal/chain` (abigen bindings ×3, quote digest/sign/verify mirroring `LanternMarket.quoteDigest`, `Client.VerifyQuote` = ecrecover + `ownerOf`, `SettleSwap` executeSwap+receipt), `internal/solver` (reference engine was already green; added `Runner` — intent → solve → sign → `SubmitQuote`, minOut slippage guard), `internal/protocol` (hub lifecycle hardened — send-under-lock, re-check after verify; `ws.go` raw-WS handler: intent/quote/retract/pick/subscribe_intents; 8 hub tests + 3 WS tests incl. full wire flow + rogue-signer rejection), config Phase 2 keys (`LANTERN_MARKET_ADDRESS`, `AGENT_REGISTRY_ADDRESS`, `REFERENCE_SOLVER_KEY`/`_AGENT_ID`/`_SLIPPAGE_BPS`, `MARKET_WS_ADDR` default `:8081`), `cmd/market` wiring (hub+WS+runner activate only when addresses/keys set). `.env.example` extended. `go test ./... -race` green, vet+gofmt clean. **Blocked for on-chain e2e: Fuji redeploy.**

* `2026-11-15` — agent: **Phase 1 done — Go market service skeleton** (`services/market/`, own Go module): config loader (root `.env`, process env wins), Hasura subscriptions-transport-ws ingest client, in-memory pool-graph store (lowercase-normalized, deep-copy reads), chaincheck (raw JSON-RPC `eth_call getReserves`, 30s consistency loop), `cmd/market` wiring with reconnect. `go test ./...` + vet + gofmt green. Live-feed verification still blocked on Fuji redeploy + `ENVIO_API_TOKEN`.
* `2026-11-14` — agent: **Phase 0 code complete (chain move + market contracts)** — `MockToken` + `DemoPool` (constant-product, 30 bps, owner `seed()`) + `LanternMarket` (signed-quote settlement, 20 bps solver fee, attestation on settle) with 93/93 forge tests; `DeployMarket.s.sol` + `seed/market.json` (5 tokens/9 pools); env renamed to `AVAX_FUJI_RPC_URL`/`DEPLOYER_PRIVATE_KEY`; explorer → Snowtrace; indexer re-pointed to Fuji 43113 with `Pool`/`Trade` entities + placeholder addresses (7/7 vitest). **Blocked: Fuji redeploy needs owner faucet AVAX.**
* `2026-11-14` — agent: **renamed arena → Lantern Finance Graph + Market + flow redesign** (owner): solvers buy the maintained pool graph via x402; solutions are signed off-chain quotes that stream in one-by-one and can be retracted; only the user-picked quote settles on-chain (`LanternMarket.executeSwap` — no submission window, no contract-side best-pick). `docs/arena.md` → `docs/market.md` rewritten; rename swept through AGENTS/README/GETTING_STARTED/docs.
* `2026-11-14` — agent: **destination chain = Avalanche** — full move decided (owner): Fuji testnet 43113 first, C-Chain later; identity stack redeploys to Fuji, Monad deployment becomes legacy read-only. Envio supports Fuji natively (`fuji.hypersync.xyz`).
* `2026-11-14` — agent: **market build plan landed** — owner locked v1 scope: own demo pools, on-chain settlement, reference solver in a new Go service (gqlgen for web + raw WS for solvers, Envio subscriptions as the realtime feed). Phases 0–4 defined.
* `2026-11-14` — agent: **agent-nav redesign** — docs renamed to semantic names (`architecture/contracts/api/indexer.md`; `frontend.md` frozen-historical, off the map); single routing table in AGENTS.md, docs/README.md now just points back; all code/comment references updated; stale `contracts/out/` artifacts cleared; seed JSON disclaimers de-referenced from deleted docs. Forge 53/53, api 18/18.
* `2026-11-14` — agent: **pivot-3 prune executed** — contracts cut to Registry + Reputation (53/53); API cut to 3 agent GETs over Envio only (18/18; chat/scoring/risk/lookup/mock deleted); snap package deleted; indexer Passport removed (4/4); hackathon docs deleted. Web frozen (known-broken typecheck until frontend rebuild).
* `2026-11-07` — Tai frontend release on `frontend-Tai`: cinematic twelve-chapter landing, 97 frontend tests. (Pre-pivot; frontend now frozen.)
