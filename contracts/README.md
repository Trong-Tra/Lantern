# Lantern — Contracts (Foundry)

> Layer doc: `../docs/contracts.md` (model, interfaces, decisions). Toolchain decision: `MEMORY.md`.

Identity stack (survived the 2026-11-14 pivot) + Phase 0 market contracts:

| Contract | Standard | Purpose |
| --- | --- | --- |
| `src/AgentRegistry.sol` | ERC-8004 (minimal) | Trustless solver identity, `registerAgent(uri) → agentId` |
| `src/Reputation.sol` | ERC-5192 (`LREP`) | Soulbound attestation history, owner + executors mint |
| `src/MockToken.sol` | ERC-20 (minimal, open mint) | Demo pool liquidity tokens |
| `src/DemoPool.sol` | constant-product pair | `swap` / `getAmountOut` / `getReserves`; owner-only `seed()` |
| `src/LanternMarket.sol` | — | Settles user-picked signed quotes, 20 bps solver fee, mints attestation |

In-house bases in `src/utils/` (`ERC721.sol`, `Ownable.sol`) — no OpenZeppelin.

## Layout

```
src/            contracts + utils bases
test/           9 test suites (93 tests)
script/         Deploy.s.sol · SeedAgents.s.sol · SeedAttestations.s.sol · DeployMarket.s.sol · seed/{agents,attestations,market}.json
lib/forge-std/  vendored (committed, no nested .git)
```

## Commands (from `contracts/`)

```shell
forge build
forge test              # 93 tests — no chain writes
```

## Deploy (Fuji PENDING owner faucet AVAX — legacy Monad deployment in docs/contracts.md)

```shell
# env from repo-root .env:
forge script script/Deploy.s.sol:Deploy --rpc-url $AVAX_FUJI_RPC_URL --broadcast
forge script script/DeployMarket.s.sol:DeployMarket --rpc-url $AVAX_FUJI_RPC_URL --broadcast
forge script script/SeedAgents.s.sol:SeedAgents --rpc-url $AVAX_FUJI_RPC_URL --broadcast
```

Notes:
- `foundry.toml` grants read-only `fs_permissions` to `./script/seed` (JSON read only).
- Seeding/deploy logic lives in `*FromJson()` functions — tests prove the same paths in-memory first (`test/DeployMarket.t.sol` includes an end-to-end split-swap on the seeded 5-token / 9-pool topology).
- `script/seed/*.json` is **fictional demo data** (`demo://` URIs).
- Env key names only in root `.env.example`; never commit `.env` values.
