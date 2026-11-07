# Frontend release — 2026-11-07

Branch: `frontend-Tai`. The new landing replaces `/`; explorer, wallet, docs and agent routes remain available.

## Install and run

Use Node.js 24 and the root-declared pnpm 12.4.2. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @lantern/web test
pnpm --filter @lantern/web lint --max-warnings=0
pnpm --filter @lantern/web exec tsc --noEmit
pnpm --filter @lantern/web build
pnpm --filter @lantern/web start
```

Configure deployment values using the existing `.env.example` files; no environment secrets are included. API/indexer and chain configuration are required for live data and transactions. An HTTP 200 from an explorer route also covers its graceful unavailable state, and does not prove the backend is connected.

## Release checks

Production build succeeds on Next.js 16.4.1, including TypeScript validation.

- 97 frontend tests cover cinematic timing, reversible transitions, prepared paths, explorer helpers, demo matching and amount validation.
- Production route smoke checks: `/`, `/docs`, `/network`, `/wallet`, `/agent/1` return 200; `/explore` redirects to `/network` with 308; model and image assets return 200.
- Desktop 1440×900 and phone 390×844: no horizontal overflow. The generic layout checker flags its kit-specific `.wrap` convention, which this existing cinematic layout does not use.
- Phone reduced-motion reading view inspected. Browser review artifacts remain outside the repository.
- Next.js and matching ESLint configuration upgraded to 16.4.1. Production dependency audit reports no advisory paths under `apps__web`; the workspace still has 8 high, 4 moderate and 7 low advisories in API/indexer/Snap dependency paths.

Live MetaMask signing, API/indexer deployment, production environment credentials and hosting deployment were not verified by this frontend release. A successful frontend build does not certify those systems.
