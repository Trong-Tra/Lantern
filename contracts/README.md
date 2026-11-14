# Lantern — Identity Contracts (Foundry)

> Layer doc: `../docs/contracts.md` (model, interfaces, decisions). Toolchain decision: `MEMORY.md`.

Two contracts — the identity stack that survived the 2026-11-14 pivot (old demo protocols deleted, see git history):

| Contract | Standard | Purpose |
| --- | --- | --- |
| `src/AgentRegistry.sol` | ERC-8004 (minimal) | Trustless solver identity, `registerAgent(uri) → agentId` |
| `src/Reputation.sol` | ERC-5192 (`LREP`) | Soulbound attestation history, owner + executors mint |

In-house bases in `src/utils/` (`ERC721.sol`, `Ownable.sol`) — no OpenZeppelin.

## Layout

```
src/            contracts + utils bases
test/           5 test suites (53 tests)
script/         Deploy.s.sol · SeedAgents.s.sol · SeedAttestations.s.sol · seed/{agents,attestations}.json
lib/forge-std/  vendored (committed, no nested .git)
```

## Commands (from `contracts/`)

```shell
forge build
forge test              # 53 tests — no chain writes
```

## Deploy (EXECUTED on Monad testnet, chain 10143 — see docs/contracts.md)

```shell
# env from repo-root .env:
forge script script/Deploy.s.sol:Deploy --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
forge script script/SeedAgents.s.sol:SeedAgents --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
```

Notes:
- `foundry.toml` grants read-only `fs_permissions` to `./script/seed` (JSON read only).
- Seeding logic lives in `registerFromJson()` — `test/SeedAgents.t.sol` proves the same path in-memory first.
- `script/seed/*.json` is **fictional demo data** (`demo://` URIs).
- Env key names only in root `.env.example`; never commit `.env` values.
