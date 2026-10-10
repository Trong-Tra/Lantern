# Lantern — Agent Root

> Agents: start at `docs/README.md`, then `MEMORY.md` (current state), then `docs/01-architecture.md` + your layer file.
> Sync protocol: `docs/06-agent-sync.md`. Landing truth: `apps/web/design.md`. Append every task to `MEMORY.md`.

* Product: passkey-native agent identity + reputation on Monad (ERC-8004 + ERC-721 Passport + ERC-5192 soulbound). Explorer + MetaMask Snap verification.
* Stack: pnpm monorepo — `apps/web` (Next.js 16), `apps/api` (Express 5 stub), `packages/{config,types,utils}`.
* Today: contracts deployed + seeded + **AgentVault live** on Monad testnet (docs/02); API (5 GETs incl. Snap lookup + chat brains); Explorer `/explore` + `/agent/[id]`; **Envio indexer live locally** (15 agents + 120 attestations via GraphQL :8080); **MetaMask Snap landed** (`packages/snap/`, local Flask testing). Dashboard + Dynamic wallet still missing. See `docs/` for target + TBDs.
* Rules: docs + code in same commit. `TBD` > invented values. Never commit `.env` values. Don't build on dead `home/experience/lantern` code.
