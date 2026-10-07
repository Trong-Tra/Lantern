# Lantern — Identity Contracts (Foundry)

> Layer doc: `../docs/02-identity-contracts.md` (model, interfaces, decisions). Toolchain decision: `MEMORY.md`.

Three contracts, one per token in the model:

| Contract | Standard | Purpose |
| --- | --- | --- |
| `src/AgentRegistry.sol` | ERC-8004 (minimal — canonical-vs-minimal owner-TBD) | Trustless agent identity, `registerAgent(uri) → agentId` |
| `src/AgentPassport.sol` | ERC-721 (`LAP`) | Transferable visual passport, 1:1 with agent |
| `src/Reputation.sol` | ERC-5192 (`LREP`) | Soulbound attestation history, owner + executors mint |

In-house bases in `src/utils/` (`ERC721.sol`, `Ownable.sol`) — no OpenZeppelin.

## Layout

```
src/            contracts + utils bases
test/           5 test suites (57 tests, incl. SeedAgents in-memory)
script/         Deploy.s.sol · SeedAgents.s.sol · seed/agents.json (15 MVP identities)
lib/forge-std/  vendored (committed, no nested .git)
```

## Commands (from `contracts/`)

```shell
forge build
forge test              # 57 tests — no chain writes
```

## Deploy + seed (PREPARED, NOT RUN — owner deferred testnet)

Run order when the owner says go:

```shell
# 1. deploy (reads MONAD_PRIVATE_KEY from env; chain-id from RPC)
forge script script/Deploy.s.sol:Deploy --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
# 2. put the printed registry address into .env as AGENT_REGISTRY_ADDRESS
# 3. seed the 15 MVP identities from script/seed/agents.json
forge script script/SeedAgents.s.sol:SeedAgents --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
```

Notes:
- `foundry.toml` grants read-only `fs_permissions` to `./script/seed` (JSON read only).
- Seeding logic lives in `registerFromJson()` — `test/SeedAgents.t.sol` proves the same path in-memory first.
- `script/seed/agents.json` is **fictional demo data** (`demo://` URIs) — quarantined per `docs/06-agent-sync.md`.
- Env key names only in root `.env.example`; never commit `.env` values.
