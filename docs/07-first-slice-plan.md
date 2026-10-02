# 07 — First Slice Plan (started 2026-10-02 → CODE COMPLETE)

> Resume file. Status: **all 8 next actions done** (code + tests + docs synced) and **committed** (docs + code together).
> Verified: `forge test` 53/53 · `pnpm typecheck` clean · web tests 23/23 · api tests 15/15 (re-run via plain `pnpm` after tool repair).

## Locked decisions for this slice (owner, 2026-10-02)

* First slice = **contracts + API skeleton** (not Envio/Snap/Explorer — they're downstream).
* Network = **Monad testnet first** (chain ID + RPC still `TBD` — never invent).
* Toolchain = **Foundry** (update `docs/02` in same commit).
* Assumed (flag to owner if it matters): **minimal ERC-8004 registry** per the `docs/02` suggested interface — canonical-vs-minimal is still listed as owner TBD in `MEMORY.md`.

## Environment verified (no re-checking needed)

* `forge 1.3.5-stable` installed at `/Users/tron/.foundry/bin/forge` (also `cast`, `anvil`).
* `forge init contracts --no-git` **already run**: `contracts/{foundry.toml,src/Counter.sol,test/Counter.t.sol,script/,lib/forge-std,README.md}` exist. forge-std cloned (network works).
* Counter stubs are placeholders — replace, don't keep.
* Read and understood: `apps/api/src/index.ts` (29 lines), `packages/{types,config,utils}/src/index.ts`.
* Decisions taken via owner Q&A, not guesses.

## Design settled (from docs/02 + docs/03 — don't re-litigate)

### Contracts (`contracts/`, root-level per docs/02, NOT a pnpm workspace member)

* Shared minimal **ERC721 base** written in-house (no OpenZeppelin dep) used by Passport + Reputation.
* **AgentRegistry** (minimal 8004): `registerAgent(uri) → agentId`, `ownerOf(agentId)`, `agentURI(agentId)`, `setAgentUri(agentId, uri)` (owner-only); events `AgentRegistered(agentId, owner, uri)`, `AgentUpdated(agentId, uri)`. No stored registration time — Envio will use block timestamp.
* **AgentPassport** (721): minted by the registered agent's owner, 1:1 `agentId ↔ tokenId`, transferable (unlike reputation), per-token `tokenURI`.
* **Reputation** (5192): `locked(tokenId) = true`, all transfers revert except mint; `Attestation { agentId, actionType(STAKE/UNSTAKE/HARVEST/SWAP), result(SUCCESS/FAIL), amount, protocol, uri }`; minter = agent owner + executors (`setExecutor` by owner); events `AttestationMinted(...)` + `Locked(tokenId)`; failures mint too.
* Tests (`forge test`) required per docs/02: mint, soulbound lock, access control, events. No test = not done.

### API (`apps/api` + shared packages)

* Types → `packages/types/src/index.ts`: `RiskLevel = LOW|MEDIUM|HIGH|UNKNOWN`, `AgentSummary`, `AgentProfile`, `Attestation`, `RiskReport` (per docs/03 sketch). **`score?: number` optional** — formula is TBD, UI uses `formatScore` → `N/A`.
* Endpoints → `API_ENDPOINTS` in `packages/config`: `GET /api/agents` (PaginatedResponse), `GET /api/agents/:id`, `GET /api/agents/:id/attestations`, `GET /api/agents/:id/risk`. **Skip POST /api/agents/register** (operator-gating decision still TBD).
* Split `apps/api/src/` into `app.ts` (express app, testable) + `index.ts` (listen) + `routes/agents.ts` + `repositories/agentRepository.ts` (interface) + `data/mockAgents.ts` — **mock must be visibly quarantined** (docs/06: fictional data behind explicit source, never mixed with live; `DATA_SOURCE` env switch can wait for Envio).
* Envelope: `createApiResponse` / `createApiErrorResponse` from `packages/utils`. CORS stays as-is this slice.
* Tests: replace `"test": "exit 1"` in `apps/api/package.json` — target `node --import tsx --test src/**/*.test.ts` (tsx already a dep; **verify the exact invocation**), spin app on port 0, fetch, assert envelope + 404 path.

## Next actions (in order) — ALL DONE 2026-10-02

1. ✅ Root `.gitignore`: `contracts/cache/` + `contracts/broadcast/` already present. Counter stubs deleted.
2. ✅ Contracts: `src/utils/ERC721.sol`, `src/utils/Ownable.sol`, `src/AgentRegistry.sol`, `src/AgentPassport.sol`, `src/Reputation.sol`.
3. ✅ Tests: `test/{AgentRegistry,AgentPassport,Reputation,ERC721}.t.sol` → `forge test` 53/53 green.
4. ✅ Types (`RiskLevel`, `AgentSummary`, `AgentProfile`, `Attestation`, `RiskReport`) + `API_ENDPOINTS` for the 4 GETs.
5. ✅ `apps/api` restructured: `app.ts` / `index.ts` / `routes/agents.ts` / `repositories/agentRepository.ts` / `data/mockAgents.ts` (quarantined).
6. ✅ API tests (`src/app.test.ts`, 15 cases, port 0), `exit 1` replaced with `node --import tsx --test "src/**/*.test.ts"` (invocation verified).
7. ✅ Verified: `forge test` · `tsc --noEmit` (repo-wide) · web test · api test.
8. ✅ Docs synced: `docs/01`, `02`, `03`, `README.md`, `MEMORY.md` (+ this file, + `AGENTS.md`).

## Environment note (session 2026-10-02)

* Homebrew pnpm initially couldn't self-switch to 12.4.2 (ENOEXEC — `.tools` install lacked its native binary because build scripts were skipped). **Repaired** same session via `node ~/Library/pnpm/.tools/pnpm/12.4.2/node_modules/pnpm/install.js`; plain `pnpm` (12.4.2) works normally again. If it recurs: that install.js is the fix.

## Handoff

```
Done: slice code complete: 5 contracts + 4 test suites (53 tests), API restructure + 4 endpoints + 15 tests, docs synced
Docs updated: 01, 02, 03, README, MEMORY, AGENTS, this file
TBD/blocked: Monad testnet chain ID/RPC; 8004 canonical vs minimal (coded minimal, flagged); score formula; POST register auth
Next: owner commits (docs+code together) → then deploy to Monad testnet (addresses) → Envio indexing
Verified: forge test 53/53; pnpm typecheck clean; web 23/23; api 15/15; pnpm tool repaired (install.js)
```
