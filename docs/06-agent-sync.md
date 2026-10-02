# 06 — Agent Sync (how we share memory)

## Rule 0

Docs are memory. If it's not in `MEMORY.md` + `docs/` + code, it didn't happen. Update both in the same commit.

## Startup checklist (every agent, every session)

1. Read `docs/README.md` → `MEMORY.md` (top entry = current state) → `docs/01-architecture.md` → your layer file (`02` contracts, `03` backend, `04` frontend, `05` integrations).
2. Check `git log --oneline -5` + `git status --short` for drift since your last sync.
3. For landing changes only: also read `apps/web/design.md`.
4. After your task: append to `MEMORY.md` log + update Current state/TBD if changed.

## Sources of truth

| Topic | Truth | Note |
| --- | --- | --- |
| Landing look/behavior | `apps/web/design.md` + code | Code wins on conflict |
| Product direction | `docs/00-vision.md` | Only human owner changes vision |
| Layer contracts | `docs/01`–`05` | Change doc + code together |
| API envelope | `packages/types` + `packages/utils` | `ApiResponse<T>` / `createApiResponse` |
| Endpoints/ports | `packages/config/src/index.ts` | `DEFAULT_API_PORT`, `API_ENDPOINTS` |

## Do

* Mark unknowns `TBD` — never invent addresses, URLs, scores, tx hashes.
* Keep fictional demo data quarantined (`DEMO_AGENTS`, mock preview) until replaced by live reads.
* Small, verifiable commits. Run `pnpm typecheck` / web `test`+`lint` for touched areas.
* Cross-link: contract event change → update `05-integrations.md` (Envio) + `03-backend-api.md` same commit.

## Don't

* Don't build on dead code (`containers/home`, `components/experience`, `components/lantern`, `globals.scss`).
* Don't add "live" numbers, GitHub/contract links, or wallet states without a wired source.
* Don't commit `.env` values, `node_modules`, `dist`, `.next`. `.env.example` keys only.
* Don't rewrite other layer's doc without syncing with its owner.

## Handoff format (paste into chat / commit msg)

```
Done: [what + files]
Docs updated: [which docs/ files]
TBD/blocked: [what you need + owner]
Next: [suggested next slice]
Verified: [commands run, e.g. pnpm typecheck]
```
