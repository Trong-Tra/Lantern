# 04 — Frontend

> **Frontend layer detail. Current state: `MEMORY.md` §Current state (wins on conflict).**

> Owner: frontend. Source of truth for landing: `apps/web/design.md` + `apps/web/docs/cinematic-experience.md`.

## Today (verified)

* `@lantern/web` — `next@16.3.5` + `react@19`, Tailwind v4, `three + R3F + drei`, `gsap + Lenis`, Radix dialog/dropdown/popover, Heroicons. Port 3000.
* Routes: `/` → `LatternExperience` (cinematic, untouched) · **`/network` → Agent Network (landed 2026-10-07)** · **`/agent/[id]` → Agent Profile + chat (landed 2026-10-07)** · `/dashboard` still missing.
* Explorer data layer: `src/libs/explorer/{api,present}.ts` — pure, package-free helpers (envelope parsing, query building, risk tone, UTC timestamps, id/page parsing) loaded by `tests/explorer.test.mjs`.
* **Live-data mode (2026-10-10)**: `DemoBanner` takes a `live` prop (server pages read `DATA_SOURCE`); emerald "Live testnet data" vs amber mock copy. Attestation rows link to `testnet.monadscan.com/tx/<hash>` via `buildExplorerTxUrl` (`packages/config`, env-overridable) when `txHash` is present.
* UI pieces: `src/components/molecules/explorer.tsx` (`DemoBanner` = honest-data guard, `RiskBadge`, `NoticeCard`) + `agent-chat-panel.tsx` (client, posts to `POST /api/agents/:id/chat` — key stays server-side).
* First live fetches exist: pages call `getApiBaseUrl()` + `buildApiUrl(API_ENDPOINTS.* , fetch)` with graceful error/not-found cards. `DemoBanner` reflects `DATA_SOURCE` (live envio vs quarantined mock) — never mix `DEMO_AGENTS` into live views.
* Landing unchanged: 11 scroll scenes (`src/constants/lattern-scenes.ts`), playhead in `src/libs/cinematic/runtime.ts`, styling in `src/styles/lattern.css` (1207 lines).
* Connect Wallet = **real wagmi injected flow** (LANDED 2026-10-13: connect → switch-to-Monad-testnet → disconnect; RPC-missing shows an honest notice). `DEMO_AGENTS` in `lattern-preview` remains **fictional** (6 agents, `resolveIntent()`, `discoverAgents()`) — quarantined to the landing preview.
* Tests: `tests/{cinematic,explorer}.test.mjs` (`node --test`, shared loader `tests/helpers/load-source.mjs`), pure logic only — 34 green. No Vitest/Jest/Playwright.
* Dead code — ignore: `containers/home/`, `components/experience/`, `components/lantern/`, `styles/globals.scss`, empty `store/` + `actions/`.

## Target (proposal)

Keep landing as-is (it's the narrative). Add app routes alongside it:

```
/                 → cinematic landing (keep)
/network          → LANDED — list from GET /api/agents, risk badges, pagination
/agent/[id]       → LANDED — profile (8004 + 721 + 5192 timeline + risk) + chat panel
/dashboard        → User Dashboard (RainbowKit connect, positions, badges, managed value)
```

* Data: LANDED — explorer reads `GET /api/agents*` + `POST /api/agents/:id/chat` via `getApiBaseUrl()` + `buildApiUrl`. Demo banner shown while the API serves quarantined mock records; `DEMO_AGENTS` stays isolated to the landing preview (never mixed).
* Wallet: add RainbowKit (missing today) for user dashboard; Dynamic for operator flow (see `05-integrations.md`). Don't reuse the fake Connect dialog for real signing.
* Snap entry: Profile + Explorer show "Verify in MetaMask" affordance once Snap ID exists.
* A11y/perf budgets from `design.md` §10 still apply: reading-mode, reduced-motion, no-JS fallback, DPR caps, 12s WebGL timeout. New routes must not regress them.

## Rules

* `transpilePackages: [@lantern/types, @lantern/utils, @lantern/config]` already in `next.config.ts` — import shared types/utils from there, don't duplicate.
* Display via `formatAddress` / `formatScore` (`packages/utils`). Score renders as a `ScoreGauge` lumen ring (`components/molecules/score-gauge.tsx`) — `N/A` only when the agent has zero executions (v1 recency-weighted formula, docs/03). `/network` redesigned 2026-10-13 to the ink/paper/lantern theme ("A network, illuminated."); formula footnote links `/docs`.
* Chain links: `buildExplorerTxUrl` (attestations, vault txs) + `buildExplorerPassportUrl(tokenId)` (ERC-721 passport → Monadscan `/nft/<contract>/<tokenId>`; contract address env-overridable, defaults to docs/02 deployment). Passport link on `/network` cards (stretched-overlay pattern) + profile Identity card.
* **On-chain write UX (LANDED 2026-10-10)**: `vault-panel.tsx` on the vault agent's profile — wagmi v3 + `injected()` connector (MetaMask/Flask; RainbowKit deferred — no WalletConnect projectId needed for the demo). Deposit/withdraw MON against the live AgentVault (docs/02); confirmed txs link to Monadscan and the minted attestation flows into the history via the indexer. Browser RPC via `NEXT_PUBLIC_MONAD_RPC_URL`; panel self-disables with a notice when it's unset. Pure amount validation in `src/libs/explorer/vault.ts` (tests/vault.test.mjs). Providers wrap the root layout (`src/components/providers.tsx`).
* **Agent-wallet corridor (LANDED 2026-10-18, the v3 demo)**: `swap-demo-panel.tsx` on agent 1's profile (docs/11 v3) — create a browser-local demo wallet → fund once from MetaMask (the only user signature) → "Release the agent" runs the 6-step sequence against the live `DemoFXPool` (viem local signer, allowances auto-approved, gate probe catches `DemoFX: policy exhausted`), then a done card with real 4-asset balances + attestations refresh. Hydration-safe localStorage restore; interrupted runs offer a fresh-wallet reset (on-chain policies are immutable).
* Run per change: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint` (+ visual check for CSS/WebGL).
