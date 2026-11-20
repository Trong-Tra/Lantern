# 04 — Frontend

> **FROZEN (2026-11-14 pivot):** this doc describes the pre-pivot frontend, which is left untouched in `apps/web` but no longer matches the backend (it references removed APIs/types). Historical until the frontend rebuild — do not build on it.
Exchange rotating headline (2026-11-15): original plus “New horizons. Clearer paths.”, “Assets flow. Possibility grows.” and “Find your path. Follow the light.” rotate every three seconds with 700ms eased fade/rise. Placement review: existing Reflow/reach research and user request; assumed 390px mobile/1440px desktop without analytics. Overlapping grid reserves tallest wrapped phrase height so chart, trade controls and shared navigation stay stable; no additional scrolling per rotation. Static accessible heading avoids repeated announcements; reduced motion shows original and hidden tabs skip updates. Responsive browser QA pending.

Exchange direction preview (2026-11-15): 20px Heroicons up-right/down-right SVGs with 2px strokes and accessible increase/decrease summary; MON 1D development fixture falls 4.82% for a default red preview. Reviewed existing placement/target-size research and user request; decorative inline icons retain existing mobile/desktop control anchors and scrolling. Browser visual QA pending.

Exchange percentage (2026-11-15): unsigned magnitude at 18px (previously 12px), retaining directional arrows and trend colors. Reviewed existing Reflow/target-size research and user request before implementation; assumed 390px mobile/1440px desktop without analytics. Value stays beside the price in the existing wrapping row; controls and navigation anchors retained. Browser visual QA pending.

Exchange continuous stroke (2026-11-15): active chart line overrides legacy dash drawing with a solid stroke and drops normalized pathLength. Clip-based currency transitions remain shared with the fill, avoiding line-only truncation when the SVG scales. Paint-only; existing placement research applies, with mobile/desktop visibility, reach and control geometry retained. Browser visual QA pending.

Exchange timeframe pill (2026-11-15): active option uses a rounded highlight inset 7px vertically inside the existing 44px button. Reviewed existing target-size/Reflow research and user screenshot before implementation; assumed 390px mobile/1440px desktop, no analytics. Paint-only: touch/pointer targets, reading order, scrolling and shared controls stay fixed. Browser visual QA pending.

Exchange chart endpoint (2026-11-15): the SVG viewport is 640 units for plot coordinates 20–620. Time labels use matching 20/640 insets within the width excluding the 80px price column; pointer mapping uses the same viewport. Removes double-reserved axis space so the latest line point aligns with Now. Placement review: existing Reflow/target-size research and user observation apply; desktop/mobile controls, scrolling, chart height and navigation remain unchanged. Data remains fictional; responsive browser QA pending.

> **Frontend layer detail. Current state: `MEMORY.md` §Current state (wins on conflict).**

> Owner: frontend. Source of truth for landing: `apps/web/design.md` (current); `apps/web/docs/cinematic-experience.md` records the older experience.

## Placement research and stable controls

Project-wide rule for every new design or layout change, including the landing, app pages, dialogs and navigation:

1. **Research before implementation.** Review relevant usability research and available project analytics or user observations before choosing content and button positions. Record sources, device/viewport assumptions and the resulting placement decisions in the task's design notes. If project data is unavailable, label assumptions and validate them with a responsive prototype; never invent scroll-depth statistics or treat a universal scroll distance or gaze pattern as fact.
2. **Place content for comfortable reading and discovery.** Consider typical scrolling on mobile and desktop separately, content length, reading order and likely attention areas. Make the page purpose and most important content visible early, provide clear cues to further content, and avoid excessive scrolling to reach essential information. Use readable widths and spacing; verify that key content stays discoverable at short and tall viewport sizes.
3. **Place actions within comfortable reach.** Consider natural thumb positions and one-handed use on mobile, and likely cursor starting positions and movement between related tasks on desktop. Put frequent actions near their related content and within practical reach, minimizing unnecessary travel without crowding targets. Account for both hands, safe areas, the on-screen keyboard, adequate touch targets and keyboard access; do not assume every user has the same grip or cursor position.
4. **Keep controls spatially stable.** Shared navigation must retain the same buttons, order, dimensions and viewport anchor across pages at each responsive breakpoint. Repeated actions should occupy consistent positions. Active, hover, loading and disabled states must not move neighboring controls. Responsive changes may adapt the layout deliberately, while preserving consistency across routes at the same viewport size.
5. **Add page-specific options without shifting existing buttons.** Use a reserved slot, a separate anchored region or a stable overflow control. A new option must not re-center, push or reorder the shared navigation. Reveal animation must not displace existing controls, cover essential content or steal focus.
6. **Verify before completing the design.** Compare representative mobile and desktop layouts and route changes, including pages with extra options, long labels and loading states. Check content visibility, scroll effort, touch/pointer travel, focus order, overlap and stable control coordinates. Record any unverified assumptions for follow-up.

This is a design workflow requirement; it does not claim that existing screens have already passed this research and verification.

## Today (verified)

Latest `/exchange` chart follows Matcha's token/market-stat header, compact price/chart tools, large plot with mock volume bars and bottom token-switch/timeframe controls. Line/candlestick and Price/MCap toggles operate on consistent development fixtures. Gold palette, centered equal-height desktop panels and existing animations remain; prior open/low/high summary rows are removed. No live market service.

Exchange chart now uses consistent per-token/per-timeframe mock histories, gold/ivory trend colors with signed text, opening baseline, axes, high/low/open and pointer/touch/keyboard inspection. Desktop chart and swap panels share a viewport-centered equal-height workspace; phones retain trading-first stacking. Requested disclaimer/fee-slippage copy removed, while mock badges remain.

* `/exchange`: Matcha-inspired chart/trade UI preview in ink, ivory and brass; searchable tokens, pair reversal, order modes, timeframes and settings. Development mode uses explicitly labeled fictional prices/balances and local quotes with fees, slippage, limit prices, 50%/Max controls and balance validation. Production keeps unavailable-data states. Existing wallet connection reused; no live quotes, market data or trade execution.

* `@lantern/web` — `next@16.3.5` + `react@19`, Tailwind v4, `three + R3F + drei`, `gsap + Lenis`, Radix dialog/dropdown/popover, Heroicons. Port 3000.
* Routes: `/` → `MythLanding` (continuous lantern journey, 2026-10-30 local working copy) · **`/network` → Agent Network (landed 2026-10-07)** · **`/agent/[id]` → Agent Profile + chat (landed 2026-10-07)** · `/dashboard` still missing.
* Explorer data layer: `src/libs/explorer/{api,present}.ts` — pure, package-free helpers (envelope parsing, query building, risk tone, UTC timestamps, id/page parsing) loaded by `tests/explorer.test.mjs`.
* **Live-data mode (2026-10-10)**: `DemoBanner` takes a `live` prop (server pages read `DATA_SOURCE`); emerald "Live testnet data" vs amber mock copy. Attestation rows link to `testnet.monadscan.com/tx/<hash>` via `buildExplorerTxUrl` (`packages/config`, env-overridable) when `txHash` is present.
* UI pieces: `src/components/molecules/explorer.tsx` (`DemoBanner` = honest-data guard, `RiskBadge`, `NoticeCard`) + `agent-chat-panel.tsx` (client, posts to `POST /api/agents/:id/chat` — key stays server-side).
* First live fetches exist: pages call `getApiBaseUrl()` + `buildApiUrl(API_ENDPOINTS.* , fetch)` with graceful error/not-found cards. `DemoBanner` reflects `DATA_SOURCE` (live envio vs quarantined mock) — never mix `DEMO_AGENTS` into live views.
* Landing: twelve original content chapters over five connected 3D configurations in `src/containers/lattern/myth.tsx` + `myth.css`; Three.js world in `src/components/organisms/lantern-journey`; reversible score in `src/libs/cinematic/chapter-transition.ts`. Detailed CC0 glTF lantern, persistent morphing rings/signals, staged copy, interactive demo and expandable field notes. Earlier cinematic runtime remains historical code.
* Connect Wallet = **real wagmi injected flow** (LANDED 2026-10-13: connect → switch-to-Monad-testnet → disconnect; RPC-missing shows an honest notice). `DEMO_AGENTS` in `lattern-preview` remains **fictional** (6 agents, `resolveIntent()`, `discoverAgents()`) — quarantined to the landing preview.
* Tests: `tests/{cinematic,explorer}.test.mjs` (`node --test`, shared loader `tests/helpers/load-source.mjs`), pure logic only — 47 green, including `myth-transition.test.mjs`. No Vitest/Jest/Playwright.
* Dead code — ignore: `containers/home/`, `components/experience/`, `components/lantern/`, `styles/globals.scss`, empty `store/` + `actions/`.

## Wallet portfolio (2026-11-14)

- `/profile`: screenshot-matched portfolio structure with full-width header/search, inline wallet and tabs, generous top spacing, 70/30 net-worth and allocation cards, flat area chart and full-width Tokens/Positions panel. Theme changes limited to ink, ivory and muted gold; no added hero or orbital decorations.
- Uses the existing real wallet connect control. Development mode uses visibly labeled fictional fixtures for balances, charts, allocation, tokens, positions, history and orders; production retains empty states. Fixtures are separate from the connected wallet and no live portfolio data is fetched. Exchange navigation links to this route.

### Profile entrance motion (2026-11-15)

- Placement review: existing mobile stacked cards and desktop 70/30 layout retained; no project scroll/reach analytics available. Assumptions: 390px phone and 1440px desktop, native scrolling and unchanged target coordinates. Shared navigation is untouched. Only noninteractive value/artwork moves; cards and controls fade in place without changing dimensions, focus or scroll.
- W3C [C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39) informs opt-in animation under `prefers-reduced-motion: no-preference`. Header, toolbar, cards and rows fade in sequence; chart wipes left to right and allocation settles gently. All content is visible without motion preference or animation support. Focus reveals parent controls immediately.
- Responsive browser/visual motion checks remain unverified; existing placement and scroll distances are unchanged.

## Target (proposal)

Keep app routes alongside the narrative landing:

```
/                 → cinematic landing (keep)
/network          → LANDED — list from GET /api/agents, risk badges, pagination
/agent/[id]       → LANDED — profile (8004 + 721 + 5192 timeline + risk) + chat panel
/dashboard        → User Dashboard (RainbowKit connect, positions, badges, managed value)
```

* Data: LANDED — explorer reads `GET /api/agents*` + `POST /api/agents/:id/chat` via `getApiBaseUrl()` + `buildApiUrl`. Demo banner shown while the API serves quarantined mock records; `DEMO_AGENTS` stays isolated to the landing preview (never mixed).
* Wallet: add RainbowKit (missing today) for user dashboard; Dynamic for operator flow (see `05-integrations.md`). Don't reuse the fake Connect dialog for real signing.
* Snap entry: Profile + Explorer show "Verify in MetaMask" affordance once Snap ID exists.
* A11y/perf budgets from `design.md` still apply: reading-mode, reduced-motion, no-JS fallback, DPR caps, 12s WebGL timeout. New routes must not regress them.

## Rules

* `transpilePackages: [@lantern/types, @lantern/utils, @lantern/config]` already in `next.config.ts` — import shared types/utils from there, don't duplicate.
* Display via `formatAddress` / `formatScore` (`packages/utils`). Score renders as a `ScoreGauge` lumen ring (`components/molecules/score-gauge.tsx`) — `N/A` only when the agent has zero executions (v1 recency-weighted formula, docs/03). `/network` redesigned 2026-10-13 to the ink/paper/lantern theme ("A network, illuminated."); formula footnote links `/docs`.
* Chain links: `buildExplorerTxUrl` (attestations, vault txs) + `buildExplorerPassportUrl(tokenId)` (ERC-721 passport → Monadscan `/nft/<contract>/<tokenId>`; contract address env-overridable, defaults to docs/02 deployment). Passport link on `/network` cards (stretched-overlay pattern) + profile Identity card.
* **On-chain write UX (LANDED 2026-10-10)**: `vault-panel.tsx` on the vault agent's profile — wagmi v3 + `injected()` connector (MetaMask/Flask; RainbowKit deferred — no WalletConnect projectId needed for the demo). Deposit/withdraw MON against the live AgentVault (docs/02); confirmed txs link to Monadscan and the minted attestation flows into the history via the indexer. Browser RPC via `NEXT_PUBLIC_MONAD_RPC_URL`; panel self-disables with a notice when it's unset. Pure amount validation in `src/libs/explorer/vault.ts` (tests/vault.test.mjs). Providers wrap the root layout (`src/components/providers.tsx`).
* **Agent-wallet corridor (LANDED 2026-10-18, the v3 demo)**: `swap-demo-panel.tsx` on agent 1's profile (docs/11 v3) — create a browser-local demo wallet → fund once from MetaMask (the only user signature) → "Release the agent" runs the 6-step sequence against the live `DemoFXPool` (viem local signer, allowances auto-approved, gate probe catches `DemoFX: policy exhausted`), then a done card with real 4-asset balances + attestations refresh. Hydration-safe localStorage restore; interrupted runs offer a fresh-wallet reset (on-chain policies are immutable).
* Run per change: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` (+ visual check for CSS/WebGL).




## Landing navigation (2026-11-15)
Home, App, Exchange and Profile navigate to /, /app, /exchange and /profile. Native landing anchors leave the cinematic runtime via full-page navigation. (Superseded for /app by "App network showcase" below.)

## App network showcase — 2026-11-18
`/app` is no longer a /network alias: it is the agent-network product surface. Header: kicker "Lantern Finance · Agent network", lede (ERC-8004 on Fuji, standing = earned attestations, verify on 8004scan), explicit disclaimer that map pins are illustrative only. Then two sections — (1) **Global host map**: react-simple-maps `geoEqualEarth` world (`/maps/land-110m.json` from world-atlas), deterministic mock pins per agent id (cities cycle by id; never presented as geolocation), pin hover/focus tooltip "Agent N · city · illustrative"; (2) **Standing board**: cards from gqlgen `agents` (react-query 15s refetch), ranked by attestation count desc then numeric id asc — rank chip is board position, not a computed score (MEMORY: no derived score/risk). Each card: `#rank`, attestation total, agent id, owner short address, registered date, 44px "Verify on 8004scan" link → `https://8004scan.io/agents/avalanche-fuji/{canonicalTokenId}` (chain **slug**, not numeric 43113; **canonical singleton token id**, not our AgentRegistry id — both verified live 2026-11-18). The link renders only when `Agent.canonicalTokenId` is non-null (dual-registration mapping from the Go API); unmapped agents hide the button rather than link to a stranger's token. Offline/empty states name the fix (start market service / seed agents). Pure logic in `src/libs/app/{network,graphql}.ts` (tested); map is `ssr:false` dynamic import.
Placement review (required before implementation): assumed 390px phone / 1440px desktop, no project gaze/scroll analytics. Content column max 1120px, padding clears the shared fixed header (120px desktop / 132px phone — same clearance family as other app routes). Map full content width with 2.1:1 aspect (1.45:1 under 600px, min-height 200px so pins stay tappable); standing grid 1 column on phones, 3 columns ≥900px — cards grow downward, no reordering of shared nav. 8004scan buttons ≥44px (W3C target size). Map is decorative for keyboard users (pins are focusable with labels but cards carry the same actions), reduced-motion disables only the kicker pulse. Shared SiteNavigation coordinates untouched. Browser visual QA on real devices still pending.

## Shared site navigation - 2026-11-15
The root layout mounts SiteNavigation once for all routes, using styles/site-navigation.css. Home, App, Exchange and Profile retain identical fixed top-right position, typography, spacing and native links everywhere. Page-specific headers keep brand, search and wallet controls below the shared navigation; duplicate main navigation rows are removed.


## Navigation elasticity - 2026-11-15
Shared navigation keeps its existing top-right anchor, spacing, 44px target height and route order. Assumptions: 390px phone and 1440px desktop; no project scroll or reach analytics available. Only inner labels and decorative underlines transform, so hit areas and neighboring controls stay fixed and no additional scrolling or pointer travel is introduced. Fine-pointer hover lifts text 2px, press compresses it, and release/underlines use restrained overshoot easing. Touch gets press feedback without sticky hover lift; native navigation is immediate. Reviewed W3C animation guidance (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html); reduced motion removes transforms and transitions. Responsive visual verification remains pending.

## Unified header - 2026-11-15
Supersedes earlier text-only navigation. Root SiteNavigation owns the logo, Home/App/Exchange/Profile links, searchable supported tokens, Exchange's real ConnectWalletButton and a Radix navigation menu on every route. Removed duplicate Exchange/Profile/explorer headers. Token results open /exchange?token= with a validated initial buy asset; this catalog is limited to MON, USDC and ETH, with no invented prices. Profile retains a separate wallet-asset filter.
Placement research: reviewed W3C consistent navigation (https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html) and target sizing (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). No project gaze/scroll/reach analytics available. Assumed 390px phone and 1440px desktop. Fixed header keeps actions discoverable without scrolling; reserved wallet/menu slots avoid movement when connection labels change. Desktop links collapse into the same menu below 1100px. Phones use a second search row to retain 44px controls and avoid crowding; page content reserves header space. This does not assume a universal thumb position. Menu uses built-in keyboard, Escape, outside-dismiss and focus handling. Logo spins on hover/focus; label/underline spring retained with reduced-motion overrides. Browser visual/route-coordinate verification remains pending.

Logo axis correction (2026-11-15): shared logo turns around its own vertical Y axis with perspective on hover/focus. Centered SVG transform origin keeps the logo anchor and all controls stable; reduced motion disables the turn. Existing placement research applies; no layout changes.


Volumetric logo (2026-11-15): hover/focus crossfades the flat mark into four intersecting gold lantern rib planes and a luminous central core in CSS 3D space. The tilted object continuously rotates on its vertical axis only while hovered/focused; fixed 28x34 slot preserves placement. Reduced motion keeps the original static mark. Existing placement research applies. No WebGL context or dependencies added; browser visual QA pending.


## Global gliding scroll and scrollbar - 2026-11-15
All non-landing routes now reuse the existing 650ms Lenis hook via root SmoothPageScroll; landing retains its own welcome/reading/fallback lifecycle, so instances never overlap. Reduced motion keeps native scrolling; touch and nested scroll regions retain native behavior. Anchors glide and Radix/wallet body scroll locks stop momentum. Shared menu is nonmodal and no longer removes the page scrollbar when opened; its overflow remains native and uses the global thin brass-on-ink scrollbar, like all pages and nested panels. No control placement or content order changes; existing placement research applies. Reviewed installed Lenis types and official setup/nested-scroll guidance (https://github.com/darkroomengineering/lenis). Browser wheel/touch/menu verification pending.

Profile chart correction (2026-11-15): line path explicitly uses fill=none to prevent SVG default black polygons between milestones; separate gradient area retained. Paint-only correction; existing placement research and control positions unchanged.

## Smooth loading and navigation (2026-11-15)
Shared header now uses Next Link with full prefetch for its route/menu/search links; client transitions preserve providers, wallet and header instead of reloading the document. This supersedes the native-navigation notes above. All routes have accessible gold shimmer skeleton fallbacks; ready content has no simulated waiting time. Network title/banner stream before API-backed results via Suspense; Exchange chart code loads independently of trade controls. Wallet balances use skeletons during the initial fetch. Reduced motion disables shimmer.
Placement review: existing live page positions and 44px header targets retained. Skeletons use responsive content columns (Exchange 1.4:1, Profile 7:3, network three-to-one); 390px phone and 1440px desktop assumed, no project analytics. Sources: official Next loading, streaming and prefetch guidance (https://nextjs.org/docs/app/api-reference/file-conventions/loading and https://nextjs.org/docs/app/guides/prefetching). Network/compile latency can still require a fallback, particularly in development; zero network latency cannot be guaranteed. Browser/throttled-device visual verification remains pending.
## Compact search and menu morph (2026-11-15)
Search motion (2026-11-15): gold hover/focus glow, spring magnifier and short results fade/slide reveal use CSS with reduced-motion opt-in. Existing placement review applies: 390px phone/1440px desktop assumptions, 44px input and anchored results; no width/position animation or extra scrolling/pointer travel. Reviewed W3C interaction animation guidance (https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html). No project reach analytics; browser visual QA pending.

Shared search is capped at 260px, right-aligned within its existing desktop slot and centered in the existing phone row. Header height, scroll clearance, wallet/menu positions and 44px targets remain unchanged. Reviewed W3C target sizing (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html); assumes 390px phone/1440px desktop, no project reach/scroll analytics. Menu morph uses supplied SVG paths and 600ms rotation/dash transitions, with reduced-motion disabled transitions; controlled Radix state covers outside dismissal, Escape and selection. Native button replaces hidden checkbox for keyboard access; Radix owns activation when used as a menu trigger.
Component location: src/components/ui (alias @/components/ui), a predictable shared primitive folder compatible with shadcn conventions. Existing cn is @/libs/utils; active global styles are src/styles/lattern.css and site-navigation.css. Tailwind v4/TypeScript/Radix already installed; no dependency or CLI initialization required for this component. Optional future shadcn CLI setup: run pnpm dlx shadcn@latest init from apps/web and select src/components/ui; preserve existing styles and configure the utils alias to @/libs/utils. Demo stays unmounted.


## Exchange equal spacing (2026-11-15)
Three equal flexible grid gaps (24px minimum) separate header, heading, panels and page bottom. Desktop panel sizing and mobile trading-first stack retained; short screens scroll. Placement review: W3C Reflow https://www.w3.org/WAI/WCAG22/Understanding/reflow.html; assumed 390px phone/1440px desktop, no project analytics. Header and hit areas unchanged. Browser visual QA pending.

## Landing header clearance - 2026-11-15
Reserved 88px desktop / 132px phone header plus 24px breathing room and safe-area inset in story panels, including reading mode. Short viewport copy scrolls inside the remaining space; shared controls and cinematic scroll stage remain stable. Removed the first chapter's Scroll to find your light button.
Placement review: W3C Focus Not Obscured guidance (https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), existing scrolling/reach notes and the user's overlap observation. Assumptions: 390px phone / 1440px desktop, no project analytics. Browser visual QA pending.

Exchange selectors/heading refinement (2026-11-15): pay/receive selectors now use existing Radix Popover anchored 8px below each trigger, right-aligned, without a full-screen matte. Search, Escape/outside dismissal and trigger focus restoration retained. Chevron SVGs use fixed 16px sizing and centered flex alignment. Heading now has 16px above and below, superseding equal flexible gaps; spare desktop height remains below panels. Placement review follows the Reflow source above: retain mobile stack and 44px targets; no project reach analytics, assumed 390px/1440px. Browser visual QA pending.

## Exchange stable heights (2026-11-15)
Panels share a viewport-responsive fixed 510–640px height across Swap/Limit/Advanced/settings; extra content scrolls internally. Mobile trading-first stack and shared controls retained. Placement review: W3C Reflow https://www.w3.org/WAI/WCAG22/Understanding/reflow.html; assumed 390px phone/1440px desktop, no analytics. Browser QA pending.

Profile axis spacing (2026-11-15): chart SVG and vertical price labels use separate flex columns with a 16px gap and intrinsic label width, replacing overlapping absolute positioning. Placement review: user-reported overlap and W3C Reflow (https://www.w3.org/WAI/WCAG22/Understanding/reflow.html); assumed 390px phone / 1440px desktop, no analytics. Chart card, navigation and controls retain their positions; browser visual QA pending.

Exchange trend colors (2026-11-15): selected token/timeframe change now drives mint-green (#72d5a3) increases and coral-red (#f08b88) decreases through the existing trend variable. Chart line, gradient and signed percentage share the status color. Supersedes gold/ivory trend styling; site surfaces and controls unchanged. Paint-only, existing placement review applies.

## Swap button refresh (2026-11-15)
Brass inset segmented order tabs, rounded raised token selectors, framed settings/reverse controls and a brushed-gold main action. Disabled mock action remains visibly muted and disabled; keyboard focus is explicit. Placement review: W3C target sizing https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html; assumed 390px phone/1440px desktop, no project analytics. Retained trading-first mobile order, anchored pickers and shared navigation; 44px control targets reduce precision demands without extra pointer travel. Existing reduced-motion rules apply. Browser visual QA pending.

## Exchange currency transitions (2026-11-15)
Chart remains mounted on token changes. Digit reels ease in/out; artwork retracts right-to-left toward the bottom-left plot origin for 320ms, then rises/reveals new history over 620ms with eased endpoints. Reduced motion updates immediately; rapid changes cancel prior frames. Origin is decorative: the price axis remains auto-scaled. Existing placement research applies: mobile/desktop layout and control coordinates unchanged. Browser visual QA pending.

Swap action refinement (2026-11-15): invalid/missing quote or insufficient balance uses a transparent background, brass border and no shadow. Valid mock quotes retain muted fill; execution stays disabled. Paint-only; existing placement review applies.

## Exchange fixed axis labels (2026-11-15)
Price ticks use six decimals for charts below $2, two otherwise; MCap always uses two decimals. Fixed 80px axis and monospace/tabular digits stabilize widths; plot reserves that column. Placement review: W3C Reflow (https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), assumed 390px phone/1440px desktop; no project analytics. Controls, panel sizes and scroll order unchanged. Browser visual QA pending.

## Exchange axis motion (2026-11-15)
Price ticks spin while deleting from right to left, then type new characters from left to right and settle their digit reels. Fixed column and digit widths remain; rapid changes cancel old animation, reduced motion shows the final label. Chart Mock data badge removed at user request; development fixtures unchanged. Supersedes chart badge visibility notes above. Paint-only; existing placement research applies, controls and layout unchanged. Browser visual QA pending.

Exchange timeframe compactness (2026-11-15): 30px buttons plus border form a 32px bar (was 44px); zero inset padding brings selected end pills to the border. Equal flex options remove mobile spacing gaps. Placement review: user-reported inset gap and W3C target sizing https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html; 30px minimum targets exceed the 24px minimum. Assumed 390px phone/1440px desktop, no analytics; same footer order and shared navigation, less vertical space. Browser visual QA pending.

Chart currency title motion (2026-11-15): name reuses the price-axis delete/type timeline, with upper/lowercase alphabet reels and equal letter slots. Final currency name is exposed to assistive technology throughout; rapid switches cancel prior frames and reduced motion shows the final name directly. Paint-only, existing placement research applies; controls and panel positions retained. Browser visual QA pending.

Swap currency icons (2026-11-15): pay/receive buttons and picker rows now use inline SVG Monad loop, USDC dollar/arcs and faceted Ethereum marks. Existing 28px icon slots, colors, labels and hit areas retained. Paint-only; existing placement research applies, with no change to visibility, scrolling or mobile/desktop reach. Browser visual QA pending.

Landing content fit (2026-11-15): chapter copy and expanded references have intrinsic height and visible overflow; ResizeObserver scales complete chapters to the space below the fixed header, anchored at the bottom on phones. Reading mode keeps natural size. Placement review: user-reported nested scrolling and W3C Reflow (https://www.w3.org/WAI/WCAG22/Understanding/reflow.html); assumes 390px mobile / 1440px desktop, no project analytics. Navigation coordinates unchanged; very short screens reduce text size. Browser visual QA pending.

Exchange candlestick colors (2026-11-15): each candle uses green (#72d5a3) when close >= open and red (#f08b88) when close < open. Body strokes and wicks share the direction color; rising bodies are filled and falling bodies retain their hollow style. Paint-only; existing placement research applies, with no changes to content visibility, scrolling, reach or control positions. Browser visual QA pending.

Exchange axis glyph correction (2026-11-15): axis-only 1.4em nonshrinking reel rows and matching translation steps prevent clipped glyphs; inline-flex centers punctuation with lining tabular digits. Fixed 80px column retained. Placement review: existing Reflow research and user screenshot apply; no controls, scrolling or mobile/desktop reach change. Browser visual QA pending.

Exchange statistic motion (2026-11-15): Market cap, 24h Volume, Holders and Age reuse the spinning delete/type value animation on changes, with reduced motion and accessible final labels. Metric label styles are scoped away from reel glyphs; taller nonshrinking reel rows keep digits aligned. Existing mobile/desktop placement research applies; visibility, scrolling and control reach retained. Browser visual QA pending.

Exchange statistic motion (2026-11-15): Market cap, 24h Volume, Holders and Age reuse spinning delete/type transitions with reduced motion and accessible final labels. Scoped label styles and taller reel rows keep digits aligned. Existing mobile/desktop placement research applies; visibility, scrolling and control reach retained. Browser visual QA pending.

Swap receive popup (2026-11-15): bottom/buy currency picker opens 8px above its right-aligned trigger; top/sell stays below. Supersedes the both-below note. Placement review: existing W3C Reflow research and user observation apply; assumed 390px phone/1440px desktop, no analytics. Upward opening reduces bottom-edge overflow and keeps choices near the touch/pointer origin without shifting controls or adding page scroll. Existing search/focus behavior retained; responsive browser QA pending.

Compact segmented controls (2026-11-15): chart style, Price/MCap and Swap/Limit/Advanced now use 30px buttons with no group padding or inter-tab gap; selected end highlights meet the inner border. Supersedes 44px order-tab sizing. Placement review uses the W3C target-size source above and user screenshots: 30px targets retain the 24px minimum, same anchors/order on assumed 390px/1440px viewports, less vertical space and unchanged pointer travel. No analytics; responsive browser QA pending.

Profile asset search (2026-11-15): visible Filter wallet tokens label removed; accessible input name retained. Search is right-aligned at the top of the wallet-assets card with equal 20px top/right margins, 240px width capped to available space and a 44px height. Placement review: W3C Reflow https://www.w3.org/WAI/WCAG22/Understanding/reflow.html and user-requested alignment; assumed 390px phone/1440px desktop, no analytics. Search remains adjacent to filtered content, keyboard accessible and in normal flow without overlap; shared navigation unchanged. Responsive browser QA pending.

Exchange axis font (2026-11-15): Arial tabular/lining digits and fixed 16px nonshrinking reel rows supersede axis 1.4em sizing. Existing placement research and user clipping observation apply; same 390px/1440px assumptions, column, scrolling and control reach. Browser QA pending.

Currency title glyph fix (2026-11-15): Arial, fixed 24px nonshrinking reel rows and 1em letter slots accommodate wide uppercase letters and align baselines. Supersedes 0.75em slots. Existing placement research and user clipping observation apply; same mobile/desktop chart location, scrolling and control reach. Browser visual QA pending.

Exchange statistic sizing (2026-11-15): desktop columns have 100px minimum widths with 14px horizontal padding, 11px labels and 15px values. Header wraps when necessary; phones use full-width two-column statistics and 14px values. Placement review uses existing W3C Reflow research and user request: assumed 390px phone/1440px desktop, no analytics; larger text remains near the currency heading with no horizontal scrolling or control relocation. Responsive visual QA pending.

Currency title spacing (2026-11-15): animated letters now reserve their actual glyph widths through invisible sizing glyphs, replacing full-em slots. Arial and 24px reel rows retained; existing placement review applies.

Exchange width refinement (2026-11-15): workspace max-width 1560px with 28px desktop gutters increases both existing grid columns. Statistics use content-sized four-column strip, 7px/10px padding and 11px/14px text; no stretching to fill header. Supersedes 100px minimum cells and two-column phone grid. Placement research: visually inspected user Matcha limit URL; same compact top-right statistics hierarchy, existing W3C Reflow guidance, assumed 390px mobile/1440px desktop without analytics. Header can wrap metrics below token on phones; shared controls, panel heights and mobile trading-first order retained. Responsive browser QA pending.

Exchange content fit (2026-11-15): supersedes fixed-height mode behavior. Reviewed existing W3C Reflow research and user-reported nested scrolling before implementation. Assumed 390px phone/1440px desktop, no project analytics: retain trading-first mobile order and stable navigation/tabs; added details extend panels downward, with normal page scrolling on short screens. Responsive browser QA pending.

Exchange chart control sizing (2026-11-15): supersedes compact chart controls with 44px minimum button targets, 12px labels, 20px icons and 24px pill radii; order tabs retained. Placement review: existing W3C target-size and Reflow research plus user screenshots; assumed 390px phone/1440px desktop without analytics. Six timeframe targets require 266px including borders and fit the phone chart content width; existing wrapping keeps controls near the chart without horizontal scrolling or shared navigation movement. Larger targets reduce touch/pointer precision demands. Browser visual QA pending.


## Matcha swap panel (2026-11-15)
Swap card now follows the inspected user-provided Matcha swap URL: charcoal surface, 24px corners, 60px plain-tab toolbar with refresh/settings, From/To chain labels, 36px token pills above 30px amounts with right-aligned fiat, circular divider reversal and white wallet action. Existing real wallet connection, Monad network, local mock calculations and preview disclosure remain; no live execution added. Supersedes brass swap button styling. Limit/Advanced retain existing preview controls and intrinsic height.
Placement research before implementation: inspected the reference card and existing W3C Reflow/target-size notes above. Assumed 390px phone and desktop; no project analytics. Token actions sit together near their amounts, mobile remains trading-first, shared navigation is unchanged, and additional mode content extends downward without inner scrolling. Browser checked desktop and 390px phone, Limit/Advanced content fit and buy picker; no horizontal overflow observed.


Swap palette refinement (2026-11-15): Matcha layout now uses the site warm ink gradient, brass borders/token pills, ivory text and antique-gold wallet action/focus outline. Supersedes charcoal/white styling above. Token identity icons retain their colors. Paint-only; existing placement research applies, with dimensions, mobile/desktop reading order, scrolling and control positions retained.

Profile search spacing (2026-11-15): reviewed existing W3C Reflow/target-size placement research and user-reported excess gap. Asset tabs now use 4px top padding (18px desktop/16px mobile previously), bringing filtered content closer to search. Assumed 390px mobile/1440px desktop, no analytics; search retains equal 20px top/right insets, touch targets and navigation positions remain stable, and less vertical space is needed. Responsive browser QA pending.

Shared header glass (2026-11-15): 48% warm ink surface with 18px backdrop blur and WebKit support. Paint-only change; reviewed existing placement research above. Mobile/desktop visibility, scroll clearance and touch/pointer targets retain their existing geometry. Responsive visual QA pending.

Exchange text contrast (2026-11-15): primary copy/amounts use cool near-white (#f3f6fc); secondary labels, chart axes and fiat use pale blue-gray (#c3cedb), placeholders #a7b6c8. Gold active controls and red/green status remain. Paint-only; existing placement research applies with mobile/desktop visibility and control coordinates retained.

Exchange order-tab contrast (2026-11-15): active Swap/Limit/Advanced tab uses a antique gold (#e8c997) fill with dark ink (#21190e) text, replacing transparent gold text. Inactive labels remain pale blue-gray. User screenshot informed this paint-only change; existing mobile/desktop placement research applies, with fixed tab dimensions and positions retained.

Exchange independent chart height (2026-11-15): chart is start-aligned with viewport-based 510–640px height, independent of the swap card's intrinsic mode/settings content. Supersedes equal-height behavior when the order form grows. Placement review before implementation: existing Reflow guidance and user-observed mode resizing; assumed 390px mobile/1440px desktop without analytics. Desktop chart stays anchored; mobile keeps trading-first flow and normal page scrolling as the form expands. No shared control relocation.

Swap currency cleanup (2026-11-15): removed the information icon/native explanation tooltip beside both currency selectors. Placement review: existing mobile/desktop reach notes and user request apply; selector and quick-amount anchors retained, no new controls or scrolling.

Exchange chart right alignment (2026-11-15): statistics group, Price/MCap tools, timeframe group and axis numbers share the chart content's right edge. Removed the plot's right bleed and axis label inset; tools/timeframes stay right-aligned when wrapping. Placement review before implementation: user alignment request and existing Reflow/target-size research; assumed 390px phone/1440px desktop without analytics. Retains 44px controls, mobile wrapping, fixed chart height and shared navigation positions; responsive visual QA pending.

Axis inset refinement (2026-11-15): vertical-axis numbers are inset 12px from the content right edge at user request; statistics and controls retain their right alignment. Supersedes axis flush alignment above. Existing placement research applies; numbers stay within the reserved 80px axis column on mobile/desktop.


Profile allocation refinement (2026-11-15): ring reveals clockwise from twelve o'clock with a 1.1s eased conic mask; center label stays upright. Saturated gold (#e8ad35), teal (#22b8aa) and violet (#a375eb) match fixture legend/token accents. Reduced motion shows the full ring immediately. Reviewed existing profile placement/C39 research before implementation: paint-only, same desktop/mobile visibility, scrolling and touch/pointer reach; controls and dimensions retained. Browser visual QA pending.

Header search border (2026-11-15): transparent outer border in all interaction states; keyboard focus outline retained. Paint-only; reviewed existing placement research, with mobile/desktop geometry, scrolling and pointer/touch reach unchanged.

Header search correction (2026-11-15): supersedes borderless note; original border/hover/focus colors restored, only offset focus outline removed. Focus retains border/background feedback; geometry unchanged.

Exchange horizontal-axis labels (2026-11-15): 12px text replaces 9px on mobile/desktop. Reviewed existing Reflow placement research; existing mobile label thinning retains spacing without moving controls or changing scrolling/reach.

Landing sticky navigation (2026-11-15): Home uses sticky top:0 with negative header-height margin to retain existing story clearance; other routes stay fixed. Reviewed existing Reflow/Focus Not Obscured and stable-control placement research before implementation: assumed 390px phone/1440px desktop, no analytics. Persistent controls avoid repeated scrolling and keep touch/pointer anchors stable; 88px desktop/132px phone heights and safe-area insets retained. Browser QA pending.

Header search surface (2026-11-15): matches Connect Wallet #ffffff0e background, 20px blur/180% saturation and #24211d unsupported-blur fallback. Focus border/glow retained. Paint-only; reviewed existing placement research: mobile/desktop visibility, scrolling, touch/pointer reach and shared control positions unchanged. Browser QA pending.

Header search refinement (2026-11-15): supersedes wallet surface; background matches header rgb(12 11 12 / 48%). Removed wallet blur/fallback; focus feedback retained. Existing placement research applies: paint-only, mobile/desktop visibility, scrolling, reach and control positions unchanged. Browser QA pending.

Landing header scroll direction (2026-11-15): supersedes always-visible sticky behavior. Header hides after scrolling down past its height and returns on upward scroll/top or keyboard focus. Menu/search/focused controls keep it visible; 8px direction threshold prevents jitter. Existing placement research applies: 390px phone/1440px desktop assumptions; same control anchors and content clearance, more reading space on downward scroll. Reduced motion removes slide transition. Browser QA pending.

Profile overview spacing (2026-11-15): reviewed existing Reflow/target-size placement research and user observation of excess space. Wallet toolbar bottom margin is now 32px desktop/tablet and 20px phone, replacing 104/76/32px. Assumed 1440px desktop/390px phone without analytics; chart appears earlier with less scrolling, toolbar targets and shared navigation anchors retained. Responsive browser QA pending.

Landing header motion optimization (2026-11-15): scroll updates coalesce through requestAnimationFrame; ResizeObserver caches header height instead of measuring layout during every scroll. Only visibility transitions update React state; 12px threshold filters direction jitter. Transform layer hint and 450ms eased settling smooth the slide; reduced motion remains immediate. Existing placement research applies: unchanged mobile/desktop anchors, clearance and touch/pointer reach. Browser performance QA pending.

Swap mode rounding (2026-11-15): Swap/Limit/Advanced highlights use the card's 24px radius. Reviewed existing placement/target-size research and user observation; paint-only on assumed 390px mobile/1440px desktop, preserving visibility, scroll and pointer/touch reach. Browser visual QA pending.

Swap mode height (2026-11-15): Swap has the same viewport-responsive 510-640px minimum height as the chart; extra settings can expand naturally, while Limit/Advanced remain intrinsic. Placement review before implementation: existing Reflow/reach research and user-observed height mismatch; assumed 390px phone/1440px desktop without analytics. Trading-first mobile order, shared navigation and targets retained; normal page scrolling accommodates expanded content. Responsive browser QA pending.

Landing logo (2026-11-16): replaced the ring centerpiece's Monad contours with the Avalanche (AVAX) two-peak mark. Reviewed existing placement/reach research above; geometry-only change within the same artwork bounds, with scrolling and mobile/desktop controls retained. Browser visual QA pending.

Landing content (2026-11-16): Lotus publication removed; the remaining research receipt has no count. Ask Lantern Finance chapter/demo and its entry links are disabled with PRODUCT_PREVIEW_ENABLED in myth.tsx; retained for future use. Reviewed existing scrolling/reflow and stable-control research for assumed 390px phone/1440px desktop: removing content reduces scrolling, keeps shared navigation anchors and existing targets. Responsive visual QA pending.

Landing chapter mapping (2026-11-16): filtered story panels retain authored animation indices via remapChapterWeights; hidden Ask Lantern Finance slot stays zero, finale remains slot 11 and transition IDs keep their original meaning. Prevents undefined weights propagating into Three.js geometry. No layout changes.

Artwork continuity (2026-11-16): LivingLight uses the shared R3F clock so neighboring precompute requests agree. The worker cache retains the last completed pose per artwork across eviction and clears it on teardown. Existing frontend-Tai spatial handoffs remain; missing worker frames no longer hide previously prepared artwork. Layout/controls unchanged; browser visual QA pending.

First circle-to-lanes handoff (2026-11-16): circle exit spans the first 36% of the handoff before ribbon widening. Original line strands stay visible through surface formation instead of being faded by the incoming chapter weight or hidden at full ribbon weight. Destination network reveal is delayed to 88-100%, overlapping the outgoing lines at 92-100%. Existing placement/reach research applies; layout, scrolling and controls unchanged. Browser visual QA pending.

## Solver globe (2026-11-19)

The solver ID footer uses its existing 44px action slot for the canonical Fuji 8004scan profile. Sample cards use the slot to open the live roster. Placement uses the target-size research above and assumes a 390px phone and 1440px desktop. The action stays inside the card alongside the identity details and preserves the shared navigation position. Responsive browser verification is pending.

The App page shows the five leading solvers by earned attestations. The local land atlas provides the globe's geography. Agent positions and randomized elevated paths are illustrative. The selected solver's registry details and canonical 8004scan link sit next to the globe on desktop and directly below it on mobile.

Placement research used [W3C's dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) and [MDN's touch-action guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action). Design assumptions were a 1440px desktop and a 390px phone without project analytics. Touch swipes rotate horizontally while vertical swipes continue scrolling the page. The 44px rotation controls and standings rows provide pointer and keyboard alternatives. Shared navigation keeps its existing position.

The globe turns slowly at idle and coasts after a drag. An amber light wave sweeps the land dots against a layered teal aurora with a faint brass edge. The pause control stops idle rotation, flights, and orbiting labels. Reduced-motion mode presents all three as still. The demo link sits with the page introduction, and `/app?demo=1` shows five labeled fictional solvers without polling the registry.

In development, `/app` opens in demo mode by default. Production opens the live network. The page links switch explicitly between `?demo=0` for live data and `?demo=1` for samples.

Production `/app` pre-renders the top ten solvers from the Lantern Go GraphQL API. After 60 seconds, the next visit receives the cached page while Next.js regenerates it. If regeneration fails, the previous page remains cached. The official globe sends no standings requests from the browser. 8004scan is an outbound profile link.

Selecting an agent from a globe dot or standings row centers the globe on that agent with a brief camera push-in. A scan reveal runs in the existing inspector position. Reduced motion centers immediately and shows the card without a reveal. The globe uses solid markers and crisp flight paths.

The globe now displays up to ten ranked agents, with ten fictional agents in demo mode. The hologram overlays the globe near the centered marker and replaces the standings panel. On compact screens the card anchors above the globe controls. Drag, rotate, close, or press Escape to dismiss. Placement follows the existing mobile and desktop reach guidance above.

The App shell fits the dynamic viewport. Its globe stage takes the space left by the header, introduction, and control row. Opening the card keeps the stage height fixed. Short screens can scroll within a long agent card while the page stays fixed. Shared navigation and the existing touch targets retain their placement.

The hologram uses a solver ID layout with a credential header, identity tile, grouped fields, and a verification footer. The panel keeps its existing overlay bounds and close target. Demo cards are labeled as samples.

The solver globe uses an amber accretion disk, wheel and button zoom, and a vertical leader from the selected marker to a screen-resolution identity card. Card height follows available space on short screens.

The black hole hides three transmissions that play in sequence on repeat visits to its dialog. Following the existing 390px phone and 1440px desktop placement review, its circular touch target stays on the painted core with a 44px minimum. The centered dialog fits within viewport margins and places the return button directly below the message. Shared navigation and the globe stage keep their positions.

The desktop solver title sits inside the observation field. On narrow screens it sits above the canvas. A separate high-DPI canvas draws the star field and lensed accretion disk on resize; the moving globe uses matching upper-right lighting.

Tiny shooting particles follow curved paths with short trails inspired by the Exchange backdrop. Brighter stars flare at different rates, dust drifts through the star band, and amber streams travel across the disk. All effects use the globe's animation clock. The pause control holds the current frame, and reduced-motion mode displays the cached sky.

The sky layers cool gas clouds and copper dust under the star band. Exposure drops behind the desktop title, while the eclipse has a directional copper rim and slower disk motion. The artwork fits the existing viewport and keeps pointer and touch targets in place.

The App footer now shows only the illustrative-location caption. Drag rotation and wheel zoom remain available. Reviewed the existing desktop and phone reach guidance; removing the controls shortens the footer at both widths.

## Archived solar system solver map (2026-11-20)

The solar system source lives in `apps/web/src/app/app-solar`. Open `/app-solar?demo=1` on the development server to preview it. Production serves the official globe at `/app`.

The eight highest-ranked solvers occupy fixed positions on evenly spaced, stylized elliptical tracks in Mercury-to-Neptune order. Drag sideways or use the left and right arrow keys to orbit the view around the Sun at 15 degrees above the orbital plane. Click, tap, or activate a planet with the keyboard to zoom into it and open its solver card above the close-up. The close-up scales to the viewport and keeps the planet in view while orbiting. Wheel and keyboard zoom adjust the close-up. Closing the card or pressing Escape restores the overview at its previous zoom. Reduced motion applies the camera change immediately.

The planets have fixed surface orientations and use brass-lit Three.js meshes, with a canvas fallback. The camera reveals different sides as it orbits. Projected planet sizes adjust when bodies draw close on screen, including Saturn's rings. Gold signal dots still travel between planets with fading dashed trails and respect reduced-motion preferences.

The Sun uses a cached canvas texture with amber granulation, limb darkening, and plasma loops in a copper corona. Its size follows the stage and camera zoom. Nearby labels can move above their planets to keep the solar disk readable.

## Official solver globe at /app (2026-11-20)

`/app` shows the Earth globe with the land atlas, drifting star field, copper accretion disk, and up to ten ranked solver markers. Drag horizontally or use the left and right arrow keys to spin around its fixed, tilted north–south axis. Selecting a marker turns it toward the front and pans and zooms to make room for the solver ID card above its vertical leader. Use the wheel or keyboard to zoom and press Escape to dismiss the ID. Demo and live links stay on `/app`. Old `/app2` links redirect to `/app` with their query parameters.

The existing dragging and touch-action research above informed the placement. The desktop intro overlays the left of the sky, while the compact intro sits above the globe and short windows can scroll to reach it. The shared header keeps its position. Desktop Edge verification covered the globe, ID card, Escape dismissal, and navigation to the solar view. Mobile touch interaction remains unverified.

The headline flips whole phrases upward every three seconds. The card footer label flips one whole word at a time when its arrow animation starts. The headline reserves the same space at desktop and mobile widths, and reduced motion displays a static heading.

The globe's solver ID uses a taller slate credential with teal rank, violet attestations, and a compact layout for short viewports. The card fits inside the stage without internal scrolling. The compact intro stays visible while a solver card is open. The W3C [reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) informed the narrow layout. The close target is 44px, and shared navigation keeps its existing placement.

The identity row puts the large teal rank on the left and the name on the right. Registry details use aligned, neutral text below the divider, with a quiet verification action at the bottom. Compact viewports use smaller rank typography to give two-digit ranks and long names room to fit.

The globe credential uses Geist. Its height follows the visible fields and footer, with tighter vertical spacing and the existing 44px action targets.

App ID card (2026-11-20): Flat translucent dark gray glass with a subtle border and blurred backdrop, ivory serif name, copper rank, and the canonical registration description directly under the name. Following [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and the existing target-size guidance, the card uses responsive bounds for assumed 390px phone and 1440px desktop widths. Selecting a marker raises the globe and card together by up to 25% of the stage height. The card keeps its marker spacing and top inset. Long descriptions are visually shortened on compact screens so the profile link and close targets remain reachable without an internal scrollbar.
