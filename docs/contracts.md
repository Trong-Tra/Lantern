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

* Locked soulbound history (`contracts/src/Reputation.sol`, name `Lantern Finance Agent Reputation`, symbol `LREP`): `locked(tokenId)` = true; transfers revert (`Reputation: soulbound`).
* **Minters**: the agent's owner + executors — `setExecutor(address, bool)` is contract-owner-only. The market contract will be an authorized executor once it exists.
* Attestation struct:
  ```
  Attestation { agentId, actionType (STAKE/UNSTAKE/HARVEST/SWAP), result (SUCCESS/FAIL), amount, protocol, uri }
  ```
  The `ActionType` enum predates the market design — likely reworked for settlement outcomes (TBD, MEMORY §TBD; a change means redeploy + reindex).
* Events: `AttestationMinted(agentId, tokenId, actionType, result)` + `Locked(tokenId)`.
* The contract is append-only — no scores on-chain. Standing is derived from the attestation feed.

## Market contracts (Phase 0, code 2026-11-14 — Fuji deployed 2026-11-15)

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
* Layout: `src/{AgentRegistry,Reputation,MockToken,DemoPool,LanternMarket}.sol`, `src/utils/*`, `test/*.t.sol`, `script/{Deploy,SeedAgents,SeedAttestations,DeployMarket,DualRegister}.s.sol`, `script/seed/{agents,attestations,market,dual-registered}.json`.
* Tests required per contract. Run: `forge test` in `contracts/` (currently 103 green).
* Every contract change updates this file + the Envio schema in the same commit.

## Deploy + seed (Fuji — DEPLOYED 2026-11-15; legacy: Monad testnet, chain 10143)

* **Fuji addresses (chain 43113, deployer `0x7EA634e331CF7b503df2e224f77a7C589462F1F2`):**
  * `AgentRegistry` → `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341`
  * `Reputation` → `0x5Df5E5FD5396e1387A982a7A7450D0c7CEaB40B8`
  * `LanternMarket` → `0xE77719De4D0921110DDcFb3497415Efd6F29f70B`
  * MockTokens (5): mUSDC `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8`, mUSDT `0x173C86c27Ea43BB541b84E72076B8CA7Ff5b1e41`, mWAVAX `0x6Eb204b09A36547fE21833744c8C9cC802C19B04`, mWETH `0x1e38cf69DA98506F14D43C82a3ca8Aa825ac8aF7`, mWBTC `0x1638ac963dA5d466d928289852c047A9d2ad7047`
  * DemoPools (9): `0xFB9D4e5d3F4f8b089739B9D2f03e21d37f87e536`, `0x49BF5bc89639b46CFe5B2eFA716BB187f253a47E`, `0x27E4967EB9e09efaD6809914874159C771b51cAc`, `0x2300Ae9042ADaF68C4C8B80FAB6e19A9249d5ca0`, `0xC82B5A7Fbc0535346C994Dd8D6d47983690B7360`, `0x4B581d01AFF9D688384F507208e56f70f71B1838`, `0x8937E9037A7Ad5d323236C7E11AE9dB0d065D982`, `0x3997d6a7B3b31EbDF39433a20a4D4eFc86c68Ca5`, `0x82DbcDa614D0b3475c64e65088cA7b73228b09e0`
  * SeedAgents ran: 15 agents (ids 1–15, owner = deployer). Same addresses in `.env` (gitignored) + `indexer/config.yaml` + README table. Broadcast artifacts: `contracts/broadcast/*/43113/run-latest.json`.
* **Legacy Monad addresses (read-only, no new development):**
  * `AgentRegistry` → `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341` (identical to Fuji — same deployer nonce; different chain!)
  * `Reputation` → `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8`
  * Deployer: `0x7EA634e331CF7b503df2e224f77a7C589462F1F2`
* Deployment order: `Deploy.s.sol` (identity) → `DeployMarket.s.sol` (tokens + pools + market; reads `AGENT_REGISTRY_ADDRESS`/`REPUTATION_ADDRESS`, seeds 5 tokens / 9 pools from `script/seed/market.json`) → `SeedAgents`/`SeedAttestations` (optional).
* All scripts take the key from `DEPLOYER_PRIVATE_KEY` env (never CLI args), RPC from `AVAX_FUJI_RPC_URL`. Chain ID read from RPC at run time.
* `script/SeedAgents.s.sol` / `script/SeedAttestations.s.sol` seed fictional demo identities + histories from `script/seed/*.json` (all `demo://` URIs, `MAX_AGENTS`/`MAX_ATTESTATIONS` guards; the `*FromJson()` loops are unit-tested in-memory — `deployFromJson` too, incl. an end-to-end split-swap on the seeded topology).
* `script/DualRegister.s.sol` **dual-registers the 15 seeded agents on the canonical ERC-8004 Fuji singleton** `0x8004A818BFB912233c491871b3d84c89A494BD9e` (MEMORY decision 2026-11-15, executed 2026-11-18) so 8004scan indexes them. Registered agentURI = EIP-8004 registration file as a base64 `data:` URI (type/name/description; neutral description cross-references our `AgentRegistry` id + address — the `demo://` seed URIs do not resolve off-chain). Writes `script/seed/dual-registered.json` (`ourId` → `canonicalTokenId`; broadcast gave **314–328** — ids are whatever the canonical registry allocates, never assumed contiguous). Idempotent (existing mapping entries are skipped) + orphan guard (canonical tokens held without a mapping file → revert). `run()`-side file IO is kept out of `registerFromJson()` so the loop is unit-tested in-memory against a mock canonical registry. Served by the Go API as `Agent.canonicalTokenId` (`DUAL_REGISTRATION_FILE`).
* Seeded Monad data (15 agents, 120 attestations) stays on the legacy chain only — it does not carry to Fuji.
