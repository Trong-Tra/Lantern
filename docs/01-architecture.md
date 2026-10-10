# 01 — Architecture

## 5 layers

```
┌─────────────────────────────────────────────────────────────┐
│ WEB APP (browser)                                           │
│ Landing → Explorer → Profile → Dashboard                    │
│ Next.js 16 + Tailwind v4 + (TBD: RainbowKit)                │
└─────────────────────────────┬───────────────────────────────┘
                              │ GraphQL (read) / REST (write)
┌─────────────────────────────▼───────────────────────────────┐
│ INDEXING (Envio HyperIndex, Monad)                          │
│ Indexes: ERC-8004 registry, ERC-721 transfers,              │
│          ERC-5192 mints, agent txs                          │
└─────────────────────────────┬───────────────────────────────┘
                              │ events
┌─────────────────────────────▼───────────────────────────────┐
│ IDENTITY (Monad contracts, TBD addresses)                   │
│ ERC-8004 Registry (canonical) │ ERC-721 Passport (visual)   │
│ ERC-5192 Reputation (soulbound, locked)                     │
└─────────────────────────────┬───────────────────────────────┘
                              │ owner / operator
┌─────────────────────────────▼───────────────────────────────┐
│ WALLET (Dynamic, passkey-native P256/WebAuthn, server-side) │
│ No seed phrase. Agent operator onboarding.                  │
└─────────────────────────────┬───────────────────────────────┘
                              │ insights API
┌─────────────────────────────▼───────────────────────────────┐
│ VERIFICATION (MetaMask Snap, Transaction Insights)          │
│ Intercepts txs to agent contracts → shows ID + history +    │
│ risk before signing                                         │
└─────────────────────────────────────────────────────────────┘
```

Reference yield loop (first agent): `loop-staking across Monad DeFi → each action mints 5192 attestation`.

## Repo mapping (today)

| Layer | Repo location | Status |
| --- | --- | --- |
| Web landing | `apps/web/src/containers/lattern/`, `components/organisms/lattern-world/`, `cinematic-lantern/`, `styles/lattern.css` | Done (cinematic, fictional data) |
| Web Explorer/Profile | `apps/web/src/app/explore/` (list) + `app/agent/[id]/` (profile + chat), helpers in `src/libs/explorer/`, UI in `components/molecules/` | Landed, reads live API; 34 tests |
| Web Dashboard | — (only `/`, `/explore`, `/agent/[id]` today) | Missing |
| Indexing | `indexer/` — Envio HyperIndex v3: `config.yaml` + `schema.graphql` + `src/handlers/` + `src/effects.ts` (on-chain reads) + vitest | Scaffolded 2026-10-10; local/cloud sync pending `ENVIO_API_TOKEN` (see `05`) |
| Identity contracts | `contracts/src/{AgentRegistry,AgentPassport,Reputation,AgentVault}.sol` + `test/*.t.sol` (Foundry); seed/deploy in `script/{Deploy,DeployAgentVault,SeedAgents,SeedAttestations}.s.sol` | **Live on testnet**: 3 contracts + vault deployed, 15 agents + 120 attestations seeded (docs/02) |
| Wallet (Dynamic) | — (Connect button is a Radix dialog stub) | Missing |
| Verification (Snap) | `packages/snap/` — Transaction Insights snap: `onTransaction` → `GET /api/agents/lookup/:address` → identity/risk panel | Landed 2026-10-10; local Flask testing (public Snap ID TBD) |
| Shared API | `apps/api/src/` — `app.ts` (testable factory), `routes/agents.ts` (5 GETs + chat), `services/openRouterChat.ts`, `repositories/agentRepository.ts`, `data/mockAgents.ts` (quarantined) | 6 endpoints live (mock-backed + OpenRouter chat) + 33 tests |
| Shared libs | `packages/config` (endpoint paths), `packages/types` (agent/attestation/risk types), `packages/utils` | Done, extend as needed |

Dead code — do not build on: `apps/web/src/containers/home/`, `components/experience/`, `components/lantern/`, `styles/globals.scss`.

## Data flow (target)

1. Operator creates passkey wallet (Dynamic) → registers agent (8004 + mints 721 Passport).
2. Yield agent executes → contract mints 5192 attestation per action (`agentId`, `actionType`, `result`, `uri`).
3. Envio indexes `AgentRegistered`, `Transfer (721)`, `AttestationMinted (5192)`, agent txs → GraphQL.
4. Web reads GraphQL (via `apps/api` proxy or direct) → Explorer list, Profile timeline, score + risk derivation.
5. User signs → Snap queries same backend/chain → renders insights panel.

## Key decisions (locked unless revisited)

* Chain: Monad — **testnet first** (owner 2026-10-02). **Live: chain ID 10143 via `MONAD_TESTNET_RPC_URL` (confirmed from RPC 2026-10-10).** Mainnet later.
* Contracts toolchain: **Foundry** in `contracts/` (root-level, not a pnpm workspace member). In-house ERC721 base, no OZ.
* API envelope: `{ success, data, message? }` via `createApiResponse` (`packages/utils/src/index.ts:33`). Keep for all new endpoints.
* Error envelope: `{ success:false, message, code? }` via `createApiErrorResponse`.
* Address display: `formatAddress`, score display: `formatScore` — reuse, don't reinvent.
* Frontend env: `NEXT_PUBLIC_API_URL` (fallback `http://localhost:4000` via `getApiBaseUrl`). Backend env: `PORT`.
* No live URLs, contract addresses, or scores in UI until wired. Show `Not published yet` / empty states.

## Open questions (TBD — do not guess)

* [~] Monad network IDs + RPCs? **Testnet DONE: chain ID 10143, RPC in `.env` (2026-10-10).** Mainnet switch still open.
* [ ] ERC-8004 reference implementation — use canonical or minimal registry? **(first slice coded the minimal interface from `docs/02` — confirm or swap to canonical)**
* [ ] 5192 metadata schema + score/risk formula location (on-chain vs indexer vs API)?
* [ ] Envio project slug + GraphQL endpoint?
* [ ] Snap ID / install link + insights source (API vs direct RPC)?
* [ ] Dynamic environment ID + server-side wallet template?
