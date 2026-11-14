# 02 — Contracts (identity + market)

> Chain: **Avalanche Fuji (43113)** — decided 2026-11-14. Phase 0 code (market contracts, deploy scripts, Fuji env rename) landed 2026-11-14; the Fuji redeploy itself is pending owner faucet AVAX. The Monad testnet deployment below is legacy read-only.

> **Surviving identity stack after the 2026-11-14 pivot.** Old demo protocols (AgentPassport, AgentVault, DemoSwap, DemoFXPool + mocks) were deleted — see git history. Deployed old instances remain on Monad testnet but are unsupported.

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

## Market contracts (Phase 0, 2026-11-14 — Fuji deploy pending)

* `MockToken.sol` — minimal mintable ERC-20 (open mint; demo liquidity only, never a value token).
* `DemoPool.sol` — constant-product pair pool: `seed()` (owner-only; adopts current token balances as reserves — seeding = mint to the pool, then `seed()`), `swap(tokenIn, amountIn)` (pulls input from caller, pushes output back), `getReserves()`, `getAmountOut(tokenIn, amountIn)`. Pool fee 30 bps. Events: `Swap(sender, tokenIn, amountIn, amountOut)` then `Sync(reserve0, reserve1)` after every swap and seed.
* `LanternMarket.sol` — settlement for user-picked quotes (`executeSwap(quote, solverSignature)`):
  * Quote = `{agentId, user, tokenIn, tokenOut, amountIn, minOut, quotedOut, deadline, nonce, routes[]}`; route = `{bps, pools[]}` (≤4 hops; bps across routes sums to 10_000; last route takes the rounding remainder).
  * Verifies: caller is `quote.user` (v1: user wallet submits), deadline not passed (off-chain guidance: solvers set ~45s), nonce unused per agent, EIP-191 personal-sign recovers to `AgentRegistry.ownerOf(agentId)` (digest domain-separated by chain id + market address).
  * Re-quotes the route set against current reserves before moving funds and re-checks after execution; reverts below `minOut`. Expired/reverted quotes mint nothing.
  * Solver fee **20 bps** of executed output → agent owner; rest → user. Mints a SWAP/SUCCESS attestation (amount = delivered output) via `Reputation` (market is an authorized executor). Event: `TradeSettled(agentId, user, tokenIn, tokenOut, amountIn, amountOut, fee, nonce)`.
* Locked parameters (owner, 2026-11-14): fee 20 bps, quote TTL ~45s, user-wallet submission, failures mint nothing.

## Conventions

* Location: `contracts/` at repo root (Foundry; not a pnpm workspace member).
* Shared **in-house bases** in `contracts/src/utils/` (ERC721, Ownable) — no OpenZeppelin dep. `MockToken` carries its own minimal ERC-20.
* Layout: `src/{AgentRegistry,Reputation,MockToken,DemoPool,LanternMarket}.sol`, `src/utils/*`, `test/*.t.sol`, `script/{Deploy,SeedAgents,SeedAttestations,DeployMarket}.s.sol`, `script/seed/{agents,attestations,market}.json`.
* Tests required per contract. Run: `forge test` in `contracts/` (currently 93 green).
* Every contract change updates this file + the Envio schema in the same commit.

## Deploy + seed (Fuji redeploy PENDING — legacy: Monad testnet, chain 10143)

* **Legacy Monad addresses (read-only, no new development):**
  * `AgentRegistry` → `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341`
  * `Reputation` → `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8`
  * Deployer: `0x7EA634e331CF7b503df2e224f77a7C589462F1F2`
* Fuji redeploy (Phase 0): owner needs faucet AVAX, then `Deploy.s.sol` (identity) → `DeployMarket.s.sol` (tokens + pools + market; reads `AGENT_REGISTRY_ADDRESS`/`REPUTATION_ADDRESS`, seeds 5 tokens / 9 pools from `script/seed/market.json`) → optional `SeedAgents`/`SeedAttestations`.
* All scripts take the key from `DEPLOYER_PRIVATE_KEY` env (never CLI args), RPC from `AVAX_FUJI_RPC_URL`. Chain ID read from RPC at run time.
* `script/SeedAgents.s.sol` / `script/SeedAttestations.s.sol` seed fictional demo identities + histories from `script/seed/*.json` (all `demo://` URIs, `MAX_AGENTS`/`MAX_ATTESTATIONS` guards; the `*FromJson()` loops are unit-tested in-memory — `deployFromJson` too, incl. an end-to-end split-swap on the seeded topology).
* Seeded Monad data (15 agents, 120 attestations) stays on the legacy chain only — it does not carry to Fuji.
