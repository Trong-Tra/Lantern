# 02 — Identity Contracts (Monad)

> Owner: contracts buddy. **Landed 2026-10-02**: `contracts/` (Foundry) with all three contracts + tests. **2026-10-07**: added `script/{Deploy,SeedAgents}.s.sol` + 15-identity `script/seed/agents.json` (`forge test` 57/57). **2026-10-10: testnet deploy + seed EXECUTED on Monad chain 10143 — addresses below.** All commits: docs + code together.

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

## Reference yield agent

* One agent, one strategy: loop staking across Monad DeFi protocols (protocols TBD).
* Each loop iteration → 1 × 5192 mint with execution outcome. Failures also mint (reputation = earned, incl. failures — matches landing `reputation` scene).
* Operator wallet = Dynamic passkey wallet. No EOAs with seed phrases in demo path.

## Conventions for contracts buddy

* Location: `contracts/` at repo root (Foundry — **locked 2026-10-02**; not a pnpm workspace member).
* Shared **in-house ERC721 base** in `contracts/src/utils/ERC721.sol` (+ `Ownable.sol`) — no OpenZeppelin dep.
* Layout: `src/{AgentRegistry,AgentPassport,Reputation}.sol`, `src/utils/*`, `test/*.t.sol`, `script/{Deploy,SeedAgents}.s.sol`, `script/seed/agents.json`.
* Tests required per contract (mint, soulbound lock, access control). No test = not done. Run: `forge test` in `contracts/` (57 green incl. seed pipeline).
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
