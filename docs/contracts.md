# 02 — Identity Contracts

> Chain: **Avalanche Fuji (43113) going forward** — decided 2026-11-14. The deployment below is the legacy Monad testnet one; Phase 0 of `docs/market.md` redeploys the same contracts to Fuji.

> **Surviving identity stack after the 2026-11-14 pivot.** Old demo protocols (AgentPassport, AgentVault, DemoSwap, DemoFXPool + mocks) were deleted — see git history. Deployed old instances remain on testnet but are unsupported.

## Model

Every solver agent = 1 × ERC-8004 identity : N × ERC-5192 attestations.

| Token | Standard | Transferable | Purpose |
| --- | --- | --- | --- |
| Identity | ERC-8004-style registry (minimal) | registry entry | Canonical verifiable ID, operator binding, agent URI |
| Reputation | ERC-5192 (Minimal Soulbound) | No (`locked()` = true) | Append-only track record. One mint per settled trade |

## ERC-8004 — AgentRegistry

* Canonical source of solver identity (`contracts/src/AgentRegistry.sol`):
  * `registerAgent(uri) → agentId` (ids start at 1, anyone may register)
  * `ownerOf(agentId)` (reverts for unknown agent)
  * `agentURI(agentId)`
  * `setAgentUri(agentId, uri)` — agent owner only
* Events: `AgentRegistered(agentId, owner, uri)`, `AgentUpdated(agentId, uri)`.
* No stored registration time — Envio uses the block timestamp of `AgentRegistered`.

## ERC-5192 — Reputation

* Locked soulbound history (`contracts/src/Reputation.sol`, name `Lantern Agent Reputation`, symbol `LREP`): `locked(tokenId)` = true; transfers revert (`Reputation: soulbound`).
* **Minters**: the agent's owner + executors — `setExecutor(address, bool)` is contract-owner-only. The market contract will be an authorized executor once it exists.
* Attestation struct:
  ```
  Attestation { agentId, actionType (STAKE/UNSTAKE/HARVEST/SWAP), result (SUCCESS/FAIL), amount, protocol, uri }
  ```
  The `ActionType` enum predates the market design — likely reworked for settlement outcomes (TBD, MEMORY §TBD; a change means redeploy + reindex).
* Events: `AttestationMinted(agentId, tokenId, actionType, result)` + `Locked(tokenId)`.
* The contract is append-only — no scores on-chain. Standing is derived from the attestation feed.

## Conventions

* Location: `contracts/` at repo root (Foundry; not a pnpm workspace member).
* Shared **in-house ERC721 base** in `contracts/src/utils/ERC721.sol` (+ `Ownable.sol`) — no OpenZeppelin dep.
* Layout: `src/{AgentRegistry,Reputation}.sol`, `src/utils/*`, `test/*.t.sol`, `script/{Deploy,SeedAgents,SeedAttestations}.s.sol`, `script/seed/{agents,attestations}.json`.
* Tests required per contract. Run: `forge test` in `contracts/` (currently 53 green).
* Every contract change updates this file + the Envio schema in the same commit.

## Deploy + seed (EXECUTED 2026-10-10 — Monad testnet, chain 10143)

* **Live addresses (still canonical after the pivot):**
  * `AgentRegistry` → `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341`
  * `Reputation` → `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8`
  * Deployer: `0x7EA634e331CF7b503df2e224f77a7C589462F1F2`
* `script/Deploy.s.sol` deploys Registry → Reputation; key from `MONAD_PRIVATE_KEY` env (never CLI args). Chain ID read from RPC at run time.
* `script/SeedAgents.s.sol` / `script/SeedAttestations.s.sol` seed fictional demo identities + histories from `script/seed/*.json` (all `demo://` URIs, `MAX_AGENTS`/`MAX_ATTESTATIONS` guards; the `*FromJson()` loops are unit-tested in-memory).
* Seeded data from the old demo (15 agents, 120 attestations) remains on-chain and indexed — usable as market test data until the Fuji redeploy.
