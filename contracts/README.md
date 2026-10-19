# Lantern — Identity Contracts (Foundry)

> Layer doc: `../docs/02-identity-contracts.md` (model, interfaces, decisions). Toolchain decision: `MEMORY.md`.

Three contracts, one per token in the model, plus the one-contract demo protocol:

| Contract | Standard | Purpose |
| --- | --- | --- |
| `src/AgentRegistry.sol` | ERC-8004 (minimal — canonical-vs-minimal owner-TBD) | Trustless agent identity, `registerAgent(uri) → agentId` |
| `src/AgentPassport.sol` | ERC-721 (`LAP`) | Transferable visual passport, 1:1 with agent |
| `src/Reputation.sol` | ERC-5192 (`LREP`) | Soulbound attestation history, owner + executors mint |
| `src/DemoFXPool.sol` | demo protocol | **current demo** (docs/11 v3): agent-wallet corridor — one funding signature, agent runs CNY→USDC→MON→SGD under an immutable 3-swap policy; 4th hop reverts |
| `src/MockUSD.sol` / `MockCNY.sol` / `MockSGD.sol` | ERC-20s (6 decimals) | corridor currencies; sole minter = DemoFXPool (our own mocks, no public faucet) |

Retired demo protocol (`DemoSwap` + `MockUSDC`) removed — see git history.

In-house bases in `src/utils/` (`ERC721.sol`, `Ownable.sol`) — no OpenZeppelin.

## Layout

```
src/            contracts + utils bases
test/           9 test suites (90 tests, incl. DemoFX corridor + lazy-vs-eager scoring gas proof)
script/         Deploy.s.sol · DeployAgentVault.s.sol · DeployDemoFX.s.sol
                SeedAgents.s.sol · SeedAttestations.s.sol · seed/{agents,attestations}.json
lib/forge-std/  vendored (committed, no nested .git)
```

## Commands (from `contracts/`)

```shell
forge build
forge test              # 90 tests — no chain writes
# judging evidence: lazy vs eager lumen-scoring gas proof (docs/09 §4.2), prints a cost table:
forge test --match-contract LumenGasComparison -vv
```

## Deploy (EXECUTED on Monad testnet, chain 10143 — see docs/02)

```shell
# identity trio (2026-10-10) then demo protocol (2026-10-18), env from repo-root .env:
forge script script/Deploy.s.sol:Deploy --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
forge script script/SeedAgents.s.sol:SeedAgents --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
forge script script/DeployDemoFX.s.sol:DeployDemoFX --rpc-url $MONAD_TESTNET_RPC_URL --broadcast
```

Notes:
- `foundry.toml` grants read-only `fs_permissions` to `./script/seed` (JSON read only).
- Seeding logic lives in `registerFromJson()` — `test/SeedAgents.t.sol` proves the same path in-memory first.
- `script/seed/*.json` is **fictional demo data** (`demo://` URIs) — quarantined per root `AGENTS.md` (never mixed with live data).
- Env key names only in root `.env.example`; never commit `.env` values.
