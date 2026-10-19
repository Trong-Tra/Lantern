# Lantern — Agent Root

> **Cold start: read THIS file + `MEMORY.md` §Current state + the ONE doc for your task. Budget ~3k tokens.**
> Rule: **MEMORY §Current state is the only source of truth for what exists NOW.** Docs describe target design. On conflict, MEMORY wins — fix the doc in the same commit.

* Product: passkey-native agent identity + reputation on Monad (ERC-8004 + ERC-721 Passport + ERC-5192 soulbound). Explorer + MetaMask Snap verification.
* Stack: pnpm monorepo — `apps/web` (Next.js 16), `apps/api` (Express 5), `packages/{config,types,utils}`, `contracts/` (Foundry, root-level), `indexer/` (Envio), `packages/snap`.
* Active track: **FinTechathon (PBCSF/WeBank) Topic F — Agent Wallet**, deadline 2026-10-20 Beijing. Canonical framing: `docs/09-agent-wallet-strategy.md` (v2). Its product vocab (Qualified Agents List, Wallet Worker Slot, dual registration) is vision-level — see MEMORY for code truth.

## Doc map (read ONE, on demand)

| Task | Read |
| --- | --- |
| Any task | `MEMORY.md` §Current state |
| Architecture / repo layout | `docs/01-architecture.md` |
| Contracts | `docs/02-identity-contracts.md` |
| API / backend | `docs/03-backend-api.md` |
| Web / UI (landing: also `apps/web/design.md`) | `docs/04-frontend.md` |
| Envio / Snap / Dynamic / OpenRouter | `docs/05-integrations.md` |
| Hackathon strategy, deck, story | `docs/09-agent-wallet-strategy.md`, `docs/10-video-scripts.md`, `docs/08-demo-runbook.md` |
| Forensics / pre-2026-10-10 history | `docs/archive/` (do NOT read routinely) |

Full index: `docs/README.md`. Vision: `docs/00-vision.md` (owner-only changes).

## Sync protocol (every session)

1. Read `MEMORY.md` §Current state + your one doc from the map.
2. `git log --oneline -5` + `git status --short` for drift since last sync.
3. After the task: append a ≤4-line entry to `MEMORY.md` log (newest on top) + update Current state/TBD if changed. Keep older log in `docs/archive/memory-log.md`.

## Hard rules

* `TBD` > invented values — never fabricate addresses, URLs, scores, tx hashes.
* Never commit `.env` values; `.env.example` keys only. No `node_modules`/`dist`/`.next`.
* Never build on dead code: `apps/web/src/containers/home|experience|lantern`, `styles/globals.scss`.
* One router per resource; envelope via `createApiResponse` (`packages/utils`); endpoints/paths in `packages/config`.
* Small, verifiable commits; run typecheck + tests for touched areas.
* Landed look/behavior of the landing: `apps/web/design.md` + code — code wins there.

## Handoff format (commit msg / chat)

```
Done: [what + files]
Docs updated: [which docs/ files]
TBD/blocked: [what you need + owner]
Verified: [commands run]
```
