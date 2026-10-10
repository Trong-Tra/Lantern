# Lantern — Agent Root

> Agents: start at `docs/README.md`, then `MEMORY.md` (current state), then `docs/01-architecture.md` + your layer file.
> Sync protocol: `docs/06-agent-sync.md`. Landing truth: `apps/web/design.md`. Append every task to `MEMORY.md`.

* Product: passkey-native agent identity + reputation on Monad (ERC-8004 + ERC-721 Passport + ERC-5192 soulbound). Explorer + MetaMask Snap verification.
* Stack: pnpm monorepo — `apps/web` (Next.js 16), `apps/api` (Express 5 stub), `packages/{config,types,utils}`.
* Today: contracts + AgentVault live on Monad testnet; API **serving live indexer data** (`DATA_SOURCE=envio`, v0 risk); Explorer with real on-chain profiles + tx links + **live vault deposit panel** (wagmi); Envio indexer live locally; MetaMask Snap landed. Dashboard + Dynamic wallet still missing. See `docs/` for target + TBDs.
* Rules: docs + code in same commit. `TBD` > invented values. Never commit `.env` values. Don't build on dead `home/experience/lantern` code.
