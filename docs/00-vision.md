# 00 — Vision

## Problem

Anyone can deploy an AI agent. Users can't tell which agent is legit, which has history, and which path is safe to sign. Current flow: blind signing → rug / poor execution / unknown reputation.

Two questions we answer:
* Discovery: *"I want to find a trustworthy yield agent."*
* Signing: *"I'm about to sign — is this agent legit?"*

## Solution

Lantern is the trust layer for the agent economy on Monad:

1. **Give every agent a verifiable identity** — ERC-8004 registry entry (canonical), ERC-721 Agent Passport (visual profile), ERC-5192 soulbound tokens (append-only reputation timeline).
2. **Make reputation visible before money moves** — web explorer for browsing, MetaMask Snap for transaction-time warnings.
3. **Make agents ownable without seed phrases** — Dynamic passkey-native wallets (P256/WebAuthn, server-side).

## Why Monad

Destination chain is **Monad** (EVM, high throughput, MON native asset). Narrative already in landing scene `monad` (`0.82–0.90`): *"Agents operate at machine speed."* 5-layer infra diagram ends at Monad. First strategy targets Monad DeFi (loop staking, MON↔USDC class intents).

## Track & bounties

* Track: **Trust, Identity & AI Infrastructure** — Prize pool $30,000.
* Bounties we explicitly target:
  * **Dynamic $5,000** — Best Use of Dynamic (passkey agent wallets).
  * **MetaMask $2,500** — Best Agent Wallet Plugin (Snap transaction insights).
  * **Envio $1,000** — Best Use of Envio (HyperIndex on Monad).

Every bounty must be demonstrable in the final demo, not just imported.

## Users

| Who | Job | Surface |
| --- | --- | --- |
| Explorer | Find a trustworthy yield agent, compare scores/history | Web App |
| Signer | Check agent before signing, abort on risk | MetaMask Snap |
| Agent operator | Register agent, attach passkey wallet, accrue soulbound history | Web App + contracts |

## Non-goals (for now)

* No multi-strategy agent marketplace. One reference agent: loop-staking yield agent.
* No fake wallet states, fake tx hashes, or fake "live" numbers. Existing landing explicitly forbids this (`design.md` §7.3, §11) — keep the rule.
* No 6-week commitment. The earlier 6-week scope doc was a draft. Current horizon: **~2-day doc sprint** → direction → build slices.

## North-star demo

1. Agent registered (8004 + 721) with passkey wallet.
2. Agent performs yield loop → each action mints 5192 attestation → Envio indexes → Explorer/Profile updates.
3. User finds agent in Explorer, opens Profile (timeline + score + risk).
4. User attempts tx → Snap shows `ERC-8004 ID + soulbound history + risk` → user signs or rejects with context.
