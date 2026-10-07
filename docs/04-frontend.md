# 04 — Frontend

> Owner: frontend. Source of truth for landing: `apps/web/design.md` + `apps/web/docs/cinematic-experience.md`.

## Today (verified)

* `@lantern/web` — `next@16.3.5` + `react@19`, Tailwind v4, `three + R3F + drei`, `gsap + Lenis`, Radix dialog/dropdown/popover, Heroicons. Port 3000.
* Routes: `/` → `LatternExperience` (cinematic, untouched) · **`/explore` → Agent Explorer (landed 2026-10-07)** · **`/agent/[id]` → Agent Profile + chat (landed 2026-10-07)** · `/dashboard` still missing.
* Explorer data layer: `src/libs/explorer/{api,present}.ts` — pure, package-free helpers (envelope parsing, query building, risk tone, UTC timestamps, id/page parsing) loaded by `tests/explorer.test.mjs`.
* UI pieces: `src/components/molecules/explorer.tsx` (`DemoBanner` = honest-data guard, `RiskBadge`, `NoticeCard`) + `agent-chat-panel.tsx` (client, posts to `POST /api/agents/:id/chat` — key stays server-side).
* First live fetches exist: pages call `getApiBaseUrl()` + `buildApiUrl(API_ENDPOINTS.* , fetch)` with graceful error/not-found cards. Fictional-data banner is mandatory until Envio lands (docs/06).
* Landing unchanged: 11 scroll scenes (`src/constants/lattern-scenes.ts`), playhead in `src/libs/cinematic/runtime.ts`, styling in `src/styles/lattern.css` (1207 lines).
* `lattern-preview` demo is **fictional**: `DEMO_AGENTS[6]`, regex `resolveIntent()` (swap/payment/bridge), `discoverAgents()` top-3 by reputation. No wallet, no RPC anywhere in `src/`; `fetch` is confined to `src/libs/explorer/` (used only by `/explore` + `/agent/[id]`).
* Connect Wallet = Radix dialog saying "no wallet in demo". GitHub/Contracts = `Not published yet`. These are intentional guards — keep until wired.
* Tests: `tests/{cinematic,explorer}.test.mjs` (`node --test`, shared loader `tests/helpers/load-source.mjs`), pure logic only — 34 green. No Vitest/Jest/Playwright.
* Dead code — ignore: `containers/home/`, `components/experience/`, `components/lantern/`, `styles/globals.scss`, empty `store/` + `actions/`.

## Target (proposal)

Keep landing as-is (it's the narrative). Add app routes alongside it:

```
/                 → cinematic landing (keep)
/explore          → LANDED — list from GET /api/agents, risk badges, pagination
/agent/[id]       → LANDED — profile (8004 + 721 + 5192 timeline + risk) + chat panel
/dashboard        → User Dashboard (RainbowKit connect, positions, badges, managed value)
```

* Data: LANDED — explorer reads `GET /api/agents*` + `POST /api/agents/:id/chat` via `getApiBaseUrl()` + `buildApiUrl`. Demo banner shown while the API serves quarantined mock records; `DEMO_AGENTS` stays isolated to the landing preview (never mixed).
* Wallet: add RainbowKit (missing today) for user dashboard; Dynamic for operator flow (see `05-integrations.md`). Don't reuse the fake Connect dialog for real signing.
* Snap entry: Profile + Explorer show "Verify in MetaMask" affordance once Snap ID exists.
* A11y/perf budgets from `design.md` §10 still apply: reading-mode, reduced-motion, no-JS fallback, DPR caps, 12s WebGL timeout. New routes must not regress them.

## Rules

* `transpilePackages: [@lantern/types, @lantern/utils, @lantern/config]` already in `next.config.ts` — import shared types/utils from there, don't duplicate.
* Display via `formatAddress` / `formatScore` (`packages/utils`). Scores `N/A` until backend returns numbers.
* Run per change: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` (+ visual check for CSS/WebGL).
