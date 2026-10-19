# 02 — Identity Contracts (Monad)

> Owner: contracts buddy. **Landed 2026-10-02**: `contracts/` (Foundry) with all three contracts + tests. **2026-10-07**: added `script/{Deploy,SeedAgents}.s.sol` + 15-identity `script/seed/agents.json` (`forge test` 57/57). **2026-10-10: testnet deploy + seed EXECUTED on Monad chain 10143 — addresses below.** **2026-10-16: `DemoSwap` + `MockUSDC` mandate demo deployed (later superseded).** **2026-10-18: `DemoFX` corridor (MockUSD/MockCNY/MockSGD + DemoFXPool) deployed — current demo, `docs/11` v3; `forge test` 96/96.** All commits: docs + code together.

## Model

Every agent = 1 × ERC-8004 identity : 1 × ERC-721 Passport : N × ERC-5192 attestations.

| Token | Standard | Transferable | Purpose |
| --- | --- | --- | --- |
| Identity | ERC-8004 (Trustless Agents registry) | registry entry | Canonical verifiable ID, operator binding, agent URI |
| Passport | ERC-721 | Yes | Visual profile, collectible identity card, links to 8004 ID |
| Reputation | ERC-5192 (Minimal Soulbound) | No (`locked()` = true) | Append-only history. One mint per meaningful action |

## ERC-8004 — Registry

* Canonical source. Landing scenes `soul` / `discover` map here (Identity, Reputation, History).
* **Implemented minimal interface** (`contracts/src/AgentRegistry.sol`) — canonical-vs-minimal still owner-TBD, flagged in `MEMORY.md`:
  * `registerAgent(uri) → agentId` (ids start at 1, anyone may register)
  * `ownerOf(agentId)` (reverts for unknown agent)
  * `agentURI(agentId)`
  * `setAgentUri(agentId, uri)` — agent owner only
* Events: `AgentRegistered(agentId, owner, uri)`, `AgentUpdated(agentId, uri)` (landed).
* No stored registration time — Envio uses block timestamp of `AgentRegistered`.
* Frontend needs: `agentId`, `owner`, `uri`, registration time.

## ERC-721 — Agent Passport

* Visual passport, **implemented** (`contracts/src/AgentPassport.sol`, name `Lantern Agent Passport`, symbol `LAP`).
* Minted **by the registered agent's owner** via `mint(agentId, uri)` — not automatic at registration. 1:1 enforced both directions (`agentOf` / `passportOf`). Second mint reverts.
* Standard `name/symbol/tokenURI`; per-token URI set at mint, updatable by holder (`setTokenUri`). Artwork/metadata TBD.
* **Transferable** (unlike reputation). Events: standard `Transfer`. Envio tracks current holder + profile link.

## ERC-5192 — Soulbound Reputation

* Locked: `locked(tokenId)` returns `true`; `transferFrom` / `safeTransferFrom` revert (`Reputation: soulbound`) — only mint (and burn) move tokens. **Implemented** (`contracts/src/Reputation.sol`, name `Lantern Agent Reputation`, symbol `LREP`).
* **Minters**: the agent's owner + executors — `setExecutor(address, bool)` is contract-owner-only; executors can mint for any agent.
* Minted per action after execution; token goes to the **agent's owner wallet** (soulbound holder).
* Attestation struct (locked in code — see above):
  ```
  Attestation { agentId, actionType (STAKE/UNSTAKE/HARVEST/SWAP), result (SUCCESS/FAIL), amount, protocol, uri }
  ```
  `amount` is uint256, `protocol`/`uri` are strings; `tokenURI(tokenId)` returns the attestation `uri`.
* Events: `AttestationMinted(agentId, tokenId, actionType, result)` + `Locked(tokenId)` (landed, tested).
* Score/risk derivation stays off-chain (indexer/API) — contract is append-only.

## AgentVault — demo deposit pool (deployed 2026-10-10)

* `AgentVault` (`contracts/src/AgentVault.sol`) — minimal single-agent deposit pool for the reference yield agent. Users deposit/withdraw MON; every flow mints a real 5192 attestation (STAKE/SUCCESS on deposit, UNSTAKE/SUCCESS on withdraw, `protocol = demo://protocols/agent-vault`), so vault activity becomes live reputation history.
* **Live:** `0xe09b383696D69B8A3Dfb2081a446D8fc62826328` (serves agent 1), authorized as Reputation executor. `script/DeployAgentVault.s.sol` deploys + authorizes in one broadcast; `AGENT_VAULT_AGENT_ID` env overrides the agent (default 1).
* Plain ETH sends revert (`use deposit()`); CEI ordering on withdraw; constructor reverts for unknown agentId.
* This is the Snap demo target: a user deposit is a real tx the MetaMask Snap can intercept and enrich (docs/05).

## DemoSwap — 3-swap mandate demo (deployed 2026-10-16, **SUPERSEDED 2026-10-18 by DemoFX below**)

> Never executed a mandate on-chain; kept for history. Its `MockUSDC` mint rights are locked in
> the contract by design — the DemoFX corridor therefore deployed its own fresh mocks.

* FinTechathon demo protocol (owner's scenario: **one signature → agent executes 3 swaps → each attested**; master plan in `docs/11`). Two new contracts: `src/DemoSwap.sol` + `src/MockUSDC.sol` (6-decimal mUSDC, in-house style).
* Flow: `delegateSwap(agentId)` payable with **exactly 0.3 MON** (3 × 0.1) stores a per-user mandate (the ONE user signature); `executeSwap(user)` is callable **only by the agent's owner** — checks mandate remaining (policy gate: 4th call reverts `DemoSwap: mandate exhausted`), mints 300 mUSDC to the user, and mints a SWAP/SUCCESS attestation through `Reputation` (DemoSwap is an authorized executor → `setExecutor` in the deploy script).
* **Live:** `DemoSwap` `0xD27386feFE7bAcd910816Fdc3d27a96C957EEabf` · `MockUSDC` `0xf19882021a0767d02168872a39a2B234ED9a7F72` (serves agent 1; keys in root `.env` + `.env.example`).
* `script/DeployDemoSwap.s.sol` deploys both, moves MockUSDC ownership to the pool, authorizes the executor — ONE broadcast. `script/RunAgentSwaps.s.sol` is the “agent worker”: with `USER_ADDRESS` + `DEMO_SWAP_ADDRESS` env it executes the mandate's 3 swaps.
* **Zero indexer changes:** attestations mint on `Reputation`, so the existing Envio `AttestationMinted` handler picks them up automatically.
* UI: `swap-demo-panel.tsx` on `/agent/1` (delegate button + mandate progress) — docs/11.

## DemoFX — agent-wallet currency corridor (deployed 2026-10-18 — **the current demo**)

* v3 demo protocol (owner's ruling: *the agent must actually automate actions on a wallet*; master plan `docs/11`). Four contracts: `src/DemoFXPool.sol` + `src/{MockUSD,MockCNY,MockSGD}.sol` (6-decimal, in-house style, sole minter = pool — **no public faucet / public USDC**).
* Flow: user **creates a browser wallet** (demo-grade local key, stated in UI), **funds it once from MetaMask (the only signature)**, then the agent acts unattended: `enroll(3)` commits a **one-active-mandate policy** — never raised/reset mid-flight; after FULL consumption the same wallet may commit a fresh mandate (the wallet and its funds are permanent, only authority is re-granted); boot leg `MON→CNY` (uncounted); three counted hops `CNY→USDC→MON→SGD` — each mints SWAP/SUCCESS (amount normalized to MON-wei, `protocol = demo://protocols/demo-fx`); **4th counted swap reverts `DemoFX: policy exhausted`** (the gate).
* Fixed symmetric rates vs MON numeraire (no arb): 1 MON = 12 mUSDC = 85.2 mCNY = 15.84 mSGD ⇒ 1 USDC = 7.10 CNY = 1.32 SGD (docs/09 corridor).
* **Live (v2, redeployed 2026-10-18 for re-enroll):** `DemoFXPool` `0xC8929Caaa4370B756c927E4b99883eb5FBED77cd` · mUSDC `0x2295654Bbef45d4594317fD075101C9E2dFE4240` · mCNY `0x6BCc3AC9C2D82308F9a0AdbB2E456D86E8D5968B` · mSGD `0x2119161E3f789E7946F7aCAe8516C63Db8a57077` (keys in root `.env` + templates; serves agent 1). v1 pool `0xae88078A…9d75` retired.
* `script/DeployDemoFX.s.sol`: deploys 4 contracts, moves mock ownership to the pool, authorizes the Reputation executor — one broadcast (gas dry-run first). Policy/quote surface for UI: `policies(address)`, `quote(routeId, inAmount)`.
* `DemoSwap` V1 gate patterns were reused here (CEI, pull/mint, receive-revert, soulbound attestations); tests in `test/DemoFX.t.sol` — 96/96 total.

## Demo attestation history (seeded 2026-10-10)

* `script/SeedAttestations.s.sol` + `script/seed/attestations.json` mint realistic fictional histories for agents 1–5 (120 attestations, tokenIds 3–122 on testnet; ~86% success, failures included — reputation = earned). Same quarantine rules as agents.json (all `demo://`, disclaimer in JSON). String enums parsed in-Solidity with revert on unknown values; `MAX_ATTESTATIONS = 500` guard; same `*FromJson()` in-memory test pattern as SeedAgents.

## Reference yield agent

* One agent, one strategy: loop staking across Monad DeFi protocols (protocols TBD).
* Each loop iteration → 1 × 5192 mint with execution outcome. Failures also mint (reputation = earned, incl. failures — matches landing `reputation` scene).
* Operator wallet = Dynamic passkey wallet. No EOAs with seed phrases in demo path.

## Conventions for contracts buddy

* Location: `contracts/` at repo root (Foundry — **locked 2026-10-02**; not a pnpm workspace member).
* Shared **in-house ERC721 base** in `contracts/src/utils/ERC721.sol` (+ `Ownable.sol`) — no OpenZeppelin dep.
* Layout: `src/{AgentRegistry,AgentPassport,Reputation,AgentVault,DemoSwap,MockUSDC,DemoFXPool,MockUSD,MockCNY,MockSGD}.sol`, `src/utils/*`, `test/*.t.sol`, `script/{Deploy,DeployAgentVault,DeployDemoSwap,DeployDemoFX,RunAgentSwaps,SeedAgents,SeedAttestations}.s.sol`, `script/seed/{agents,attestations}.json`.
* Tests required per contract (mint, soulbound lock, access control). No test = not done. Run: `forge test` in `contracts/` (96 green incl. seed pipelines + DemoFX + DemoSwap).
* No addresses in frontend until deployed — **now deployed (2026-10-10, above): frontend may surface them once actually wired** (until then keep `Not published yet`).
* Every contract change updates this file + Envio schema (`05-integrations.md`) in the same commit.

## Deploy + MVP seed (EXECUTED 2026-10-10 — Monad testnet, chain 10143)

* **Live addresses:**
  * `AgentRegistry` → `0x62cd4e0C5B0D4587861a21710ed15ba1823a6341`
  * `AgentPassport` → `0x5Df5E5FD5396e1387A982a7A7450D0c7CEaB40B8`
  * `Reputation` → `0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8`
  * Deployer + owner of all 15 seeds: `0x7EA634e331CF7b503df2e224f77a7C589462F1F2` (4.07 MON left after deploy + seed).
  * Verified on-chain: `ownerOf(1/8/15)` = deployer, `agentURI` returns `demo://…`, `ownerOf(16)` reverts `AgentRegistry: unknown agent` → exactly 15 seeded.
  * Paste the three addresses into root `.env` (`AGENT_REGISTRY_ADDRESS`, `AGENT_PASSPORT_ADDRESS`, `REPUTATION_ADDRESS` — keys added to `.env.example`).

* `script/Deploy.s.sol` deploys Registry → Passport → Reputation; key from `MONAD_PRIVATE_KEY` env (never CLI args). Chain ID is read from `MONAD_TESTNET_RPC_URL` at run time — never hardcoded.
* `script/SeedAgents.s.sol` registers the **15 MVP identities** from `script/seed/agents.json` (count is guarded: empty → revert, `MAX_AGENTS = 100`). Registration loop lives in `registerFromJson()` so `test/SeedAgents.t.sol` proves the same code path **in-memory — zero chain writes**.
* Seed data rules: URIs use the non-resolvable **`demo://`** scheme (no invented ipfs links), fictional identities flagged in the JSON `disclaimer`, **single operator wallet** owns all 15 (MVP simplification — multi-owner needs funding per wallet).
* Env (`.env.example`): `MONAD_TESTNET_RPC_URL`, `MONAD_PRIVATE_KEY`, `AGENT_REGISTRY_ADDRESS` (set after deploy).
* Commands run 2026-10-10 (from `contracts/`): `forge script script/Deploy.s.sol:Deploy --rpc-url $MONAD_TESTNET_RPC_URL --broadcast` → `forge script script/SeedAgents.s.sol:SeedAgents --rpc-url $MONAD_TESTNET_RPC_URL --broadcast` (with `AGENT_REGISTRY_ADDRESS` exported). Both: `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`.
* Next: canonical-8004 confirmation (owner) + Envio indexing against the live addresses.
