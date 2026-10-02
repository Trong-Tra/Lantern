# 02 — Identity Contracts (Monad)

> Owner: contracts buddy. **Landed 2026-10-02**: `contracts/` (Foundry) with all three contracts + tests (`forge test` 53/53). Committed with docs. Deploy (testnet) not started — deferred by owner.

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
* Layout: `src/{AgentRegistry,AgentPassport,Reputation}.sol`, `src/utils/*`, `test/*.t.sol`.
* Tests required per contract (mint, soulbound lock, access control). No test = not done. Run: `forge test` in `contracts/`.
* No addresses in frontend until deployed. Frontend shows `Not published yet` (existing rule).
* Every contract change updates this file + Envio schema (`05-integrations.md`) in the same commit.
* Next: deployment (Monad testnet — chain ID/RPC TBD) + canonical-8004 confirmation from owner.
