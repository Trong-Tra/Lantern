# Lantern — Shared Memory Index

> Single entry for every agent (human or AI) working in this repo.
> Read this first, then the file matching your task. Keep docs in sync with code.

## Product in one line

Passkey-native agent identity and reputation platform on **Monad**.
Every autonomous agent gets verifiable **ERC-8004 identity** + **ERC-721 Agent Passport** + non-transferable **ERC-5192 soulbound history**.
Users discover agents in a web explorer and verify them at signing time via a **MetaMask Snap**.

Tagline: `Illuminate the agent economy.` — `Trust shouldn't be a leap in the dark.`

## Doc map

| File | What it answers | Owner |
| --- | --- | --- |
| `docs/00-vision.md` | Why this exists, who it's for, track + bounties | product |
| `docs/01-architecture.md` | 5 layers, repo mapping, data flow | all |
| `docs/02-identity-contracts.md` | ERC-8004 / ERC-721 / ERC-5192 + yield agent minting | contracts buddy |
| `docs/03-backend-api.md` | Current Express stub → target API + Envio consumption | backend buddy |
| `docs/04-frontend.md` | Current cinematic landing → Explorer / Profile / Dashboard | frontend |
| `docs/05-integrations.md` | Dynamic (passkey) + MetaMask Snap + Envio | integrations |
| `docs/06-agent-sync.md` | How agents share memory, conventions, Do/Don't | all |
| `docs/07-first-slice-plan.md` | **Resume plan** — first slice (contracts + API): done + committed; handoff lists next moves | all |
| `MEMORY.md` (root) | Living log: state, decisions, TBD, newest-first | all — update every task |
| `apps/web/design.md` | Cinematic landing spec (existing, source of truth for landing) | frontend |
| `apps/web/docs/cinematic-experience.md` | Cinematic dev + fallback boundaries (existing) | frontend |

## Repo snapshot (2026-10-02, verified)

```
Lantern/
├── apps/web/          # @lantern/web — Next.js 16 + React 19, Tailwind v4, R3F/GSAP/Lenis, port 3000
├── apps/api/          # @lantern/api — Express 5: app.ts factory + routes/agents + repository + quarantined mock; 4 read endpoints + tests, port 4000
├── packages/config/   # DEFAULT_API_PORT=4000, API_ENDPOINTS (incl. /api/agents/*), APP_CONFIG, tsconfig.base.json
├── packages/types/    # envelope types + RiskLevel, AgentSummary/Profile, Attestation, RiskReport
├── packages/utils/    # formatAddress, formatScore, sleep, createApiResponse, buildApiUrl
├── contracts/         # Foundry (root-level, NOT a pnpm member) — AgentRegistry/AgentPassport/Reputation + utils/ERC721.sol, forge test green
└── README.md          # monorepo setup (existing)
```

* Package manager: `pnpm@12.4.2`, workspaces `apps/*`, `packages/*`.
* Git: `main`, remote `git@github.com:Trong-Tra/Lantern.git`. First slice **committed** (docs + code together).
* Frontend has **no** live fetch, wallet, or RPC. `NEXT_PUBLIC_API_URL` unused. Demo agents are fictional (`DEMO_AGENTS` in `lattern-preview`).
* Backend reads go through `AgentRepository` — active source is the quarantined mock (`data/mockAgents.ts`) until Envio lands.

## How to use these docs

1. Starting a task? Read this README + `01-architecture.md` + your layer file.
2. Changing behavior? Update the matching doc in the same PR/commit. Docs are code.
3. Unsure / placeholder? Mark `TBD` explicitly. Never invent contract addresses, URLs, or scores.
4. Conflict between doc and code? Code wins for `apps/web` landing (see `design.md`); docs win for everything not yet built — then fix code to match.
