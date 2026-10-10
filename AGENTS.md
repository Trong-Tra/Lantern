# Lantern — Agent Root

> Agents: start at `docs/README.md`, then `MEMORY.md` (current state), then `docs/01-architecture.md` + your layer file.
> Sync protocol: `docs/06-agent-sync.md`. Landing truth: `apps/web/design.md`. Append every task to `MEMORY.md`.

* Product: passkey-native agent identity + reputation on Monad (ERC-8004 + ERC-721 Passport + ERC-5192 soulbound). Explorer + MetaMask Snap verification.
* Stack: pnpm monorepo — `apps/web` (Next.js 16), `apps/api` (Express 5 stub), `packages/{config,types,utils}`.
* Today: contracts deployed + seeded on Monad testnet (docs/02 addresses); API (4 GETs + chat brains); Explorer `/explore` + `/agent/[id]`; **Envio indexer scaffolded in `indexer/`** (sync/deploy blocked on `ENVIO_API_TOKEN`). Wallet (Dynamic)/Snap/dashboard still missing. See `docs/` for target + TBDs.
* Rules: docs + code in same commit. `TBD` > invented values. Never commit `.env` values. Don't build on dead `home/experience/lantern` code.
