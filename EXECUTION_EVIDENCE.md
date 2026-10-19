# Lantern — Execution Evidence

Links and on-chain references for everything important deployed on Monad testnet (chain 10143).

> Truth rule: contract addresses are taken from `MEMORY.md` §Current state and root `.env`. Full transaction hashes are **TBD** — they were not captured in the source available to this session. Where a hash is TBD, the Monadscan address link is provided instead. Update this file with real tx hashes after a manual dry run or `cast` lookup.

## Explorer

- Monadscan Testnet: https://testnet.monadscan.com
- Address pattern: `https://testnet.monadscan.com/address/<ADDRESS>`
- Tx pattern: `https://testnet.monadscan.com/tx/<TX_HASH>`

## Deployed contracts (Monad testnet, chain 10143)

| Contract | Address | Monadscan | Deploy script | Tx hash |
|----------|---------|-----------|---------------|---------|
| AgentRegistry (ERC-8004) | `0x62cd4e0C…a6341` | [view](https://testnet.monadscan.com/address/0x62cd4e0Ca6341) | `script/Deploy.s.sol:Deploy` | TBD |
| AgentPassport (ERC-721) | `0x5Df5E5FD…40B8` | [view](https://testnet.monadscan.com/address/0x5Df5E5FD40B8) | `script/Deploy.s.sol:Deploy` | TBD |
| Reputation (ERC-5192) | `0xb5A7CEB3…b72f8` | [view](https://testnet.monadscan.com/address/0xb5A7CEB3b72f8) | `script/Deploy.s.sol:Deploy` | TBD |
| AgentVault (serves agent 1) | `0xe09b3836…26328` | [view](https://testnet.monadscan.com/address/0xe09b383626328) | `script/DeployAgentVault.s.sol` | TBD |
| DemoFXPool v2 (corridor) | `0xC8929Caa…77cd` | [view](https://testnet.monadscan.com/address/0xC8929Caa77cd) | `script/DeployDemoFX.s.sol:DeployDemoFX` | TBD |

Deployer / owner: `0x7EA634e3…2F1F2` (~2.09 MON left on testnet)

## Seeded on-chain data

| Item | Detail | Tx hash |
|------|--------|---------|
| Passport token 1 → agent 1 | ERC-721 mint, agent 1's passport | TBD |
| 15 seed agents | `SeedAgents.s.sol` → 15 identities registered | TBD |
| 120+ seeded attestations | `SeedAttestations.s.sol` → STAKE / HARVEST / SWAP attestations for agents 1–5 | TBD |

## Retired (removed from codebase)

| Item | Status |
|------|--------|
| DemoSwap v1 | Retired, never executed on-chain; contracts + tests removed |
| MockUSDC v1 | Retired with DemoSwap |
| v1 DemoFXPool `0xae88…9d75` | Retired; replaced by v2 `0xC8929Caa…77cd` (re-enroll-after-exhaustion) |

## Verification commands

```bash
# Contract addresses from on-chain
cast code 0x62cd4e0Ca6341 --rpc-url $MONAD_TESTNET_RPC_URL   # AgentRegistry
cast code 0x5Df5E5FD40B8 --rpc-url $MONAD_TESTNET_RPC_URL   # AgentPassport
cast code 0xb5A7CEB3b72f8 --rpc-url $MONAD_TESTNET_RPC_URL   # Reputation
cast code 0xe09b383626328 --rpc-url $MONAD_TESTNET_RPC_URL   # AgentVault
cast code 0xC8929Caa77cd --rpc-url $MONAD_TESTNET_RPC_URL   # DemoFXPool

# Reputation executor authorized (pool is executor)
cast call 0xb5A7CEB3b72f8 "executors(address,address)(bool)" 0xC8929Caa77cd 0xC8929Caa77cd --rpc-url $MONAD_TESTNET_RPC_URL

# Agent 1 passport owner
cast call 0x62cd4e0Ca6341 "ownerOf(uint256)(address)" 1 --rpc-url $MONAD_TESTNET_RPC_URL
```

## Off-chain evidence

| Item | Location | Status |
|------|----------|--------|
| API live agents (15) | `http://localhost:4000/api/agents` (DATA_SOURCE=envio) | Live |
| Agent 1 profile + 62 attestations | `http://localhost:4000/api/agents/1` | Live |
| Envio indexer (Hasura :8080) | `http://localhost:8080/v1/graphql` | Live locally |
| MetaMask Snap (Flask :8081) | `packages/snap/` | Local dev only |
| Forge test suite | `contracts/` | 90/90 pass |
| API test suite | `apps/api/` | 85/85 pass |
| Web test suite | `apps/web/` | 36/36 pass |
