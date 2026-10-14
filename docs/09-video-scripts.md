# 09 — Demo Video Scripts (3 videos)

> Record with: 3 terminals running (T1 indexer, T2 API, T3 web), funded
> wallet, MetaMask on Monad testnet. Screen: `Cmd+Shift+5` → Record
> Selected Portion. Browser zoom 125%, bookmarks bar hidden, clean desktop.
> Every video ≤ 2:00. Dry-run the deposit ONCE before recording (you lose
> 0.1 MON and the baseline number changes — re-baseline from the API first).

## Baseline (check before every take)
```bash
curl -s localhost:4000/api/agents/1 | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print(d['executions'], len(d['attestations']))"
```
Current: 62 executions / 62 attestations → after deposit: 63/63. Say whatever
the API says, not what this doc says.

---

## Video 1 — PITCH (~1:45)
*Sell the problem and the team. You on camera optional; voiceover + screen fine.*

| Time | Show | Say (your words — the spine) |
| --- | --- | --- |
| 0:00–0:15 | Cinematic landing scrolling itself (/) | "AI agents are everywhere. They move money, execute trades, act for us. The question is which ones you can trust." |
| 0:15–0:35 | Quick cuts: noisy agent claims | "Today 'reputation' is self-reported. Marketing. Off-chain databases nobody can audit." |
| 0:35–1:00 | /network — emerald banner, 15 agents, lumen gauges | "Lantern gives every agent an ERC-8004 identity and an earned, soulbound reputation on Monad — minted by contracts, not claimed by the agent." |
| 1:00–1:25 | /agent/1 — attestations, tx ↗ click through to Monadscan | "Every execution is an on-chain attestation. Follow any entry to the chain. Two perfect runs score 4, not 100 — track record can't be faked." |
| 1:25–1:40 | Deposit 0.1 MON → refresh → 63rd attestation | "And it's live. Stake with an agent and its history updates in real time." |
| 1:40–1:45 | Logo + tagline | "Illuminate the agent economy." + ONE line: "Built by former exchange engineers — the research is published in IEEE." |

---

## Video 2 — PROJECT DEMO (~2:00)
*The full product walkthrough. No Snap. This is what 'what does it do?' gets.*

| Time | Show | Narration angle |
| --- | --- | --- |
| 0:00–0:10 | Landing hero ("Trust shouldn't be a leap in the dark") | One-line vision, scroll through scene 11 (The builders) naturally. |
| 0:10–0:35 | /network: pulse dot, "A network, illuminated.", gauges | "Real on-chain data, indexed live by Envio." Point at the spread: Yield Keeper 92 glowing, fresh agents dark N/A. Read the formula footnote aloud. |
| 0:35–1:00 | /agent/1: hero, gauge, passport #1 on Monadscan ↗ | Click ONE tx ↗ → Monadscan opens. "This isn't our database." Then click passport link → ERC-721 on Monadscan. |
| 1:00–1:20 | Chat: "How many failures do you have?" | "Five — from its real stats." If the reply comes back weird (free model flake), just re-send once on camera, no apology. |
| 1:20–1:50 | Stake panel: 0.1 MON → Deposit → sign → success + tx link | Slow down; judges watch a real transaction. |
| 1:50–2:00 | Refresh → newest STAKE · SUCCESS row + re-run the count | "The contract wrote it, Envio caught it, the UI updated. End to end." |

---

## Video 3 — ENVIO DATA FLOW (~1:45) ⭐ the bounty video
*The field says "show data flowing end to end through Envio". Make the three
hops undeniable — the final GraphQL count CHANGE is 80% of the video's value.*

| Time | Show | Narration angle |
| --- | --- | --- |
| 0:00–0:15 | T1 terminal: HyperIndex syncing Monad testnet | "Envio's HyperSync streams Monad into Postgres through HyperIndex." |
| 0:15–0:40 | Terminal: the GraphQL curl against Hasura → JSON with agent 1 + attestations | "Here's the raw indexed data — the only thing our API reads." (curl below) |
| 0:40–1:00 | `curl localhost:4000/api/agents/1` → same data as REST | "The API is a thin pass-through." |
| 1:00–1:15 | Browser /agent/1 — same attestations rendered | "And the UI reads the API. Three hops, all live." |
| 1:15–1:45 | **THE KILL SHOT:** deposit 0.1 MON in browser → immediately re-run the GraphQL curl → count 62→63 → refresh page → 63rd row | "A contract event on Monad just became a UI row — in seconds, without our servers touching it." |

```bash
# the curl to have ready in a terminal (count the attestations array)
curl -s localhost:8080/v1/graphql -H 'content-type: application/json' \
  -H 'x-hasura-admin-secret: testing' \
  -d '{"query":"{ Agent_by_pk(id: \"1\") { name attestations { actionType result txHash } } }"}'
```

**Envio tips**
- Record the kill shot as its own clip if needed — an edit is fine, the data changing is what matters.
- Say "events-only handlers + Effect API storage reads" once — signals depth to sponsor judges.
- If indexing lags 3–5s, wait on camera. A visible delay is honest proof of real-time indexing.

---

## Recording order
1. **Video 3 first** (uses one deposit; needs everything healthy)
2. **Video 2 second** (same running stack)
3. **Video 1 last** (cut together from clips of the other two + landing scroll)

## Failure drills (memorize)
| Symptom | Fix |
| --- | --- |
| 3 agents on /network | API serving mock → restart `pnpm dev:api` (env race fixed in 19af488, but restart cures a stale process) |
| Amber "Demo data" banner | `DATA_SOURCE=envio` missing in apps/web/.env → restart web |
| Chat error | Send once more — free-tier chain (429 auto-falls-back, occasionally a weird model answers; re-roll) |
| Wrong network in MetaMask | Panel has "Switch to Monad Testnet" |
| Deposit reverts | You're on the wrong account — use the funded demo wallet |
