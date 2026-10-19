# Lantern — Agent Wallet Strategy Brief (v2)

> Trust infrastructure for AI financial participants.
> Prepared for the 2026 Shenzhen International FinTech Competition (FinTechathon) International Track, Topic F — Agent Wallet.
> Status: strategy proposal. Figures cited with [n] — see References. Anything not yet built is marked **(planned)** or **(TBD)**.
> Figures: Fig.1 System Architecture · Fig.2 Runtime — One Action End-to-End · Fig.3 Cross-Border — The Agent Follows Her.

---

## 1. Problem

AI has crossed from *financial tool* to *financial participant*. WeBank operates 80+ "digital employees" — AI agents with formal onboarding and performance reviews — and describes its operating model as *"AI-led execution, where humans define objectives, set boundaries and provide oversight"* [1]. The spending is budgeted, not predicted: agentic AI investment is projected at $155B by 2030 [2], and the financial-services agentic market is estimated at $7.78B in 2026, compounding to $43.52B by 2031 [3].

Yet the adoption numbers tell a different story: **99% of companies plan to deploy agents — only 11% have** [4]. On the demand side: **83% of banking customers are anxious** about AI agents acting on their finances, and **only 5% will allow it even with approval** [5][6]. In 2025 the FBI tracked AI-linked fraud as its own category for the first time — 22,364 complaints, ~$893M — and the CFTC's case file includes a fake "AI trading bot" that took ~$1.7B [7][8].

The conclusion is direct: **the bottleneck is not intelligence. It is that no verifiable trust infrastructure exists between an agent and the money it wants to manage.**

For cross-border users, this failure is sharpest. Cross-border rails are objectively broken by the standards the G20 set for itself: sending $200 costs **6.36% on average — double the UN's 3% target** (13.64% via banks) [9]; only 50.6% of wholesale payments credit within an hour (Asia-Pacific: 25.6%) [10]; the Bank of England puts cross-border at up to **10× the cost of domestic** [11]. The measured root cause is per-hop compliance re-verification — every intermediary re-checks every counterparty because no shared, machine-verifiable trust standard exists [10][11].

And beneath the cost statistics sits a quieter failure that no rail upgrade fixes: **the border kills trust.** A Chinese student in Singapore cannot reach FISCO BCOS — it is a permissioned consortium for institutions, not people. The agent that managed her money at home is unreachable; her track record is locked behind the consortium wall. She starts from zero: new country, new apps, new strangers to trust, no credit file, no history. *Cross-border finance is a trust desert with no shared courts, no shared bureaus, and — for agents — no shared reputation.*

**Problem statement:** *The agent economy and RMB internationalization are blocked by the same missing primitive — a verifiable, enforceable, portable trust record for AI financial participants. And for international users, the missing primitive is personal: trust that survives the border crossing.*

---

## 2. Customer Persona

**Primary persona — the delegating cross-border user.**

> **Mei-Lin, 26 — from Guangdong, graduate student in Singapore.**
> In China she held a WeBank account, and with it a dedicated AI agent — *Yield Keeper* — that managed her savings for three years. She knows its passport: Lumen Score 86, Tier 2, 400+ attestations, every number earned in production.
> Then she moved to Singapore. FISCO BCOS stayed behind the consortium wall — unreachable from her phone. The old way says: new country, new app, new agent, blank slate, blind trust. Her three-year record counts for nothing.
> What she *can* reach is Arbitrum — a public L2 with gas she can afford. **With Lantern, Yield Keeper appears on Arbitrum: same passport, same history, nothing re-onboarded. As if nothing changed — because nothing did.**
> The agent now manages her Arbitrum wallet — crypto holdings, DeFi positions — but advises in *her* frame: every position priced in **CNY (her native lens: "good value in yuan?")**, **SGD (her daily life)**, and **USD (the global market)**. Family remittances arrive in CNY and tuition leaves on schedule, every hop attested. And every action still mints attestations on the same passport — her record keeps growing, border or no border.
> **Needs:** (a) the agent she already trusts, usable where she actually lives; (b) multi-currency judgment denominated in her native frame; (c) access to DeFi yield on infrastructure she can afford; (d) a financial record that crosses borders with her.

**Secondary persona — the deploying institution.**

> **Wei, VP of Agent Governance at a digital bank.**
> Runs a roster of AI agents (advisory, execution, reconciliation) and answers to risk, compliance, and regulators. Wants to (a) grant agents more autonomy because unit economics demand it, (b) prove to audit and regulators that every agent action is within policy, and (c) reach cross-border customers without rebuilding a trust stack in-house — and without asking those customers to trust a brand-new agent.
> **Needs:** a shared, regulator-legible reputation and permissioning infrastructure his agents can plug into — one that ports natively to the consortium chains his bank already runs (FISCO BCOS).

**Design consequence:** the product must serve both sides of the delegation — the user whose agent *follows her across the border*, and the institution that *governs after deploying*.

---

## 3. Solution

**Lantern is the agent wallet that verifies before you sign: AI agents manage your funds, every action is permanently attested to a soulbound passport, computed into a battle-tested score, and enforced through score-gated permissions — with identity portable between the FISCO BCOS consortium and public EVM chains.**

The stack (live on Monad testnet, chain 10143, verifiable via Monadscan; EVM-compatible port to FISCO BCOS — §5):

| Layer | Mechanism | What it does |
| --- | --- | --- |
| Identity | ERC-8004-style registry | One canonical on-chain identity per agent; resolvable, ownable, auditable |
| Passport | ERC-721 Agent Passport | The agent's consolidated visual identity — its "financial ID card" |
| Conduct history | ERC-5192 soulbound attestations | Every consequential action minted as a **non-transferable** attestation, by the counterparty — never self-declared. History cannot be sold, washed, or reset |
| Score | Lumen Score v2 (§4.2) | A single explainable number, recomputed lazily on read as a pure function of attestation timestamps — **zero gas until a new attestation lands** |
| Discovery | Qualified Agents List (Top N) | Live ranking of agents by score; the wallet's default picking surface |
| Delegation | Wallet Worker Slot | A user assigns an agent to a slot with a signed mandate (action types, caps, schedule); the slot is the only door to her funds |
| Signing-time verification | MetaMask Snap (Transaction Insights) | The wallet surfaces passport, score, and risk band at the moment of commitment |
| Demo capital | AgentVault | Live vault where an agent manages funds; every deposit/withdraw mints attestations — the score is earned against real (testnet) value flows |

**The one-sentence story:** *an agent acts in the vault; every action is permanently attested to its soulbound passport; the score recomputes; the updated score governs what the agent may do next — and the passport, with its full history, can follow the agent across chains and across borders.*

---

## 4. Differentiators

Three elements: a consolidated identity **passport**, a core **formula**, and an **X-factor** — *Reputation-Gated Autonomy* — each mapped against (R1) elevating Chinese financial agents relative to U.S. counterparts, and (R2) facilitating RMB internationalization.

### 4.1 Differentiator 1 — The consolidated identity "passport"

One ERC-721 passport per agent aggregates everything a counterparty needs: canonical identity (ERC-8004), full soulbound conduct history (ERC-5192), and the live Lumen Score — portable across platforms, inspectable in an explorer, verifiable inside any wallet via the Snap.

- **(R1)** The U.S. agent ecosystem is fragmented — each platform maintains siloed, gameable ratings. A *consolidated, non-resettable* passport is structurally superior: bad history follows the agent across every venue. For Chinese institutions this plugs into existing governance doctrine — WeBank's "digital employees" already have onboarding and performance reviews; the passport is that discipline made *interoperable and machine-verifiable*.
- **(R2)** For an international user, the passport collapses due-diligence from "trust the app" to "verify the passport" — the same primitive as the live Singapore–Shenzhen cross-border data validation platform (Accredify × WeBank, FISCO BCOS + hash verification, Baihang Credit reports, trial ops 2026-01) [12], applied to agents.

### 4.2 Differentiator 2 — The core formula (Lumen Score v2)

A single explainable score computed from the soulbound attestation history — deliberately assembled from the most battle-tested scoring systems ever deployed (Elo, RiskMetrics/EWMA, Bayesian shrinkage as in IMDb's Top-250, TrueSkill's conservative estimates) and pointed at a data source those systems never had: a non-transferable, on-chain conduct record.

```javascript
L = 100 × [ V · A  +  (1 − V) · A₀ ]
A   = Σᵢ γ^(aᵢ) · xᵢ / Σᵢ γ^(aᵢ)     EWMA recency-weighted accuracy
V   = n / (n + m)                     Bayesian trust mass
γ   = 2^(−1/30)                       30-day half-life
xᵢ ∈ {0,1}                            attestation outcome
n   = total attestations   m = 30     prior strength   A₀ = 0.5
```

**Recency and dormancy:** the score is recency-weighted — each attestation's influence decays with a 30-day half-life, so a dormant agent's score drifts back toward the neutral prior. *Today's #1 cannot coast on yesterday's wins; reputation is continuously earned, never owned.* Decay is computed **lazily, not scheduled**: because every attestation carries its timestamp, the score is derived on read as a pure function of history — no daily on-chain writes, no keeper bots, no gas spent maintaining time. On-chain gating recomputes the same function at action time, so every gate check is exact and costs gas only when it matters.

> **Gas proof — measured, judge-rerunnable (2026-10-18).** From `contracts/`: `forge test --match-contract LumenGasComparison -vv`
> (test stays in the repo; `vm.cool` forces cold storage, so each figure is what one real transaction pays; spot 102 gwei, history = 120 attestations):
>
> | Path | Per action (gas) | 100 actions (MON @ spot) |
> | --- | --- | --- |
> | **A — lazy, as shipped**: mint attestation only, score derived off-chain on read | **153,092** | **1.56** |
> | B — eager, delta write per action (works only for countable stats — the lumen formula is a pure function of ALL of history, so this shape can't carry it) | 182,181 (1.19×) | 1.86 |
> | **C — eager, lumen formula on-chain per action** (re-read full history, rewrite score) | **2,720,429 (17.8×)** | **27.75** |
> | C at 2× history (recompute only) | 5,111,112 — the O(history) trap | — |
>
> **Lazy recompute saves ≈ 26.2 MON per 100 actions (≈ 94% of the scoring bill) at demo history — and the gap widens linearly as history grows.** Counterfactual contract `EagerLumenScorer` lives beside the test, never deployed.

Worked examples (fresh attestations, A₀ = 0.5, m = 30):

| Agent | History | A | V = n/(n+m) | L | Tier read |
| --- | --- | --- | --- | --- | --- |
| α — brand new | 2/2 success, today | 1.00 | 0.06 | **53** | T0: promising, unproven — no user funds |
| β — demo "Yield Keeper" | 62 attestations, 92% | 0.92 | 0.67 | **78** | T2: corridor access unlocked |
| γ — volume farmer | 200 attestations, 75% | 0.75 | 0.87 | **72** | T2 ceiling: volume alone can't reach T3 |
| δ — institutional | 500 attestations, 95% | 0.95 | 0.94 | **92** | T3: treasury-scale autonomy |

**Gaming resistance:** history cannot be sold (soulbound); sybil re-registration restarts at prior 50 / T0; volume farming asymptotes (trust mass grows ≈ m/(n(n+m))); attestations are counterparty-minted, never self-declared.

**(R1)** This is the agent-economy equivalent of the credit-scoring discipline Chinese finance runs at national scale — standardized, cross-institution, regulator-legible — with every parameter carrying a published precedent.

**(R2)** L is the routing key for corridor incentives: preferential FX spreads, fee tiers, and CNY product access attach to tiers. Because tiers are earned on-chain, China-facing issuers get a distribution channel whose quality control is mathematics.

### 4.3 Differentiator 3 — The X-factor: **Reputation-Gated Autonomy (RGA)**

> **The agent's live score does not merely display trust — it enforces it. Every agent action flows through a five-stage pipeline whose permission gateway is bound to on-chain reputation tiers.**

```javascript
① IDENTITY → ② POLICY GATE (tier check) → ③ EXECUTION → ④ ATTESTATION (mint) → ⑤ SCORE UPDATE
```

- **① Identity** — the action carries the agent's passport; unregistered agents are rejected at the door.
- **② Policy gate** — the contract checks live tier against the action's risk class *before* execution, and effective limits are min(tier cap, user mandate cap). A Tier-1 agent cannot execute a Tier-3 action, no matter what its prompt says. Gate failure reverts *before anything exists on-chain* — prompt-proof by construction.
- **③ Execution** — bounded by the dual caps.
- **④ Attestation** — outcome minted as a soulbound attestation: success, failure, amount, reason. **Failure is attested with the same permanence as success — and punished twice**: below-prior agents lose trust mass (V) the more they operate, on top of falling accuracy (A).
- **⑤ Score update** — feeds §4.2, moving the tier for the *next* action. Autonomy is **earned in production**, not granted at deployment.

**Tier sketch (parameters illustrative, calibrated in pilot):**

| Tier | Lumen score | Autonomy granted |
| --- | --- | --- |
| T0 — Registered | ≥ 0 | Identity only; sandbox; no user funds |
| T1 — Proven | ≥ 40 | Small delegated limits; basic execution |
| T2 — Trusted | ≥ 70 | Elevated limits; multi-product; **CNY corridor access (R2)** |
| T3 — Systemic | ≥ 90 | Institutional limits; treasury-scale; best-tier economics |

**(R1)** RGA inverts the U.S. model (maximal autonomy, post-hoc liability): a standardized, auditable, machine-enforced process where permission precedes execution and every step leaves a permanent record — precisely what Chinese financial regulation rewards, and what an institution needs to defend an agent's action to audit, a regulator, or a court. Because tiers derive from a *shared* on-chain history, every institution that mints attestations makes every other institution's gating smarter — a network-effect flywheel siloed U.S. ratings cannot match.

**(R2)** RGA converts trust into CNY flows: users interact with one verified agent instead of FX workflows; tier-gating gives Chinese issuers distribution with built-in quality control (e-CNY deposit products, money-market funds, Bond Connect / Wealth Management Connect-eligible assets). Every corridor action mints attestations — the internationalization effort itself builds agents' reputational capital.

### 4.4 Differentiator 4 — Native-currency judgment (the cross-border lens)

Cross-border users do not think in one currency. Lantern's advisory layer denominates every position in the user's three frames — **native (CNY: "good value in yuan?"), local (SGD: "worth it here?"), global (USD: "what the market sees?")** — so a Guangdong student evaluating an Arbitrum DeFi position judges it exactly as she would at home. Multi-currency management is not a feature list; it is the *frame of reference* baked into how the agent advises.

---

## 5. FISCO BCOS Deployment — the consortium path

FISCO BCOS executes Solidity through an EVMC-abstracted EVM — *"the Solidity contract is the same as Ethereum"* [13]. **The port is redeployment, not a rewrite.**

- **Same contracts, two homes.** Registry, passports, attestations, vault, and score functions deploy as-is on FISCO BCOS under consortium governance. ERC-8004 is chain-agnostic by design (CAIP-10 multichain agent references; cross-chain reputation aggregation is an active standard workstream) — Lantern implements a *dual registration*: one agent, two chains, one passport [14].
- **Hash-anchored sync.** Registries on both sides anchor each other's records by hash — SPV/Merkle verification, the same architecture as the live Shenzhen–Singapore credit validation platform [12]. **Identity and records cross; value never does.**
- **Ecosystem surface.** The FISCO BCOS founding open-source workgroup — WeBank, 深证通 (SSCC), Tencent, Huawei, 四方精创, 神州信息, 博彦科技 (Beyondsoft), 越秀金科, 亦笔科技 — plus certified partners such as iFlytek, already operate or serve deployed financial agents (WeBank's digital employees, Tencent 元器, Huawei Agentic Banking, Beyondsoft BOWEN, 神州信息 Agent OS, 长亮 AIS, 宇信 智能体) [1][15]. *These are the agents Lantern verifies and caps — none of them yet has a portable, enforced reputation.*
- **What changes semantically:** agent registration moves from permissionless to consortium-approved (a stronger guarantee); attestation minters become consortium members (a perfect fit for the counterparty-minted rule); deployment requires governance onboarding — exactly what a WeBank-adjacent pilot is for.

---

## 6. Cross-border coverage — Topic C pain points, inside the Topic F entry

**Framing decision (locked):** one submission, Topic F only; the cross-border story is the flagship use case, answering every Topic C pain point:

| Topic C pain point | Lantern answer | In the story |
| --- | --- | --- |
| **Remittances** | Delegated to a verified agent; conversion + settlement on licensed rails (CIPS / mBridge / HK Payment Link **(planned)**); every hop mints an attested receipt | Family CNY arrives; money home goes out — auditable per hop |
| **Tuition payments** | Standing mandate under RGA: tier-capped, schedule-bound, human-approved at setup — the agent can pay but *provably cannot exceed its mandate* | Tuition leaves on schedule; she audits any time |
| **Credit building** | The passport is a portable, verifiable conduct record — the Accredify/WeBank primitive applied to personal finance. She graduates with proof, not a blank slate | Three years of WeBank history cross the border with her |
| **Multi-currency management** | Multi-currency positions with CNY legs; every position denominated in CNY/SGD/USD; the Lumen tier governs which corridors and products the agent may touch | The §4.4 lens — her native frame, everywhere |

**Root-cause bridge (say this):** *"All four pain points share one root cause: cross-border users start from zero every time they cross. Lantern's answer is that the agent — and the record — follow them."*

---

## 7. Completion status

**Built (~50%, live on Monad testnet, chain 10143):**
Identity registry, passports, soulbound attestations, Lumen Score (v1 approximation in demo), Qualified Agents List, wallet worker slots, explorer, Snap verification, AgentVault with real deposit/withdraw attestations (15 agents, 120+ seeded attestations).

**Remaining (~50%, pilot roadmap):**

- v2 exact recalibration in-contract; score-derived caps (specified, not coded)
- BPMN orchestration lane with human-oversight checkpoints (designed, not built)
- CNY corridor: FX quotes, incentive tables, licensed-partner settlement **(planned; TBD: partner, corridor scope — HK-first)**
- FISCO BCOS deployment + dual registration + hash-anchored sync **(planned)**
- Multi-asset vault incl. simulated FX leg **(planned)**

---

## 8. Figures

- **Fig.1 — System Architecture.** FISCO BCOS executor panel (EVMC: the port is redeployment); On-chain Space (registry/passport/reputation/vault with links); event funnel → Lumen Score processing → wallet; ecosystem grid of founding workgroup agents; hash-anchored sync between chains.
- **Fig.2 — Runtime: One Action, End-to-End.** User action → discovery (Qualified Agents List) → Snap verification & mandate → policy gate (checked before every action; failure = nothing on-chain) → execution → attestation (success ✓ / failure ✗, double penalty) → score → network re-ranks itself. Reputation is a public good.
- **Fig.3 — Cross-Border: The Agent Follows Her.** China panel (WeBank years; consortium wall) → the border (old way: trust resets) → Arbitrum (same passport, cheap gas, DeFi) → native-currency lens (CNY/SGD/USD) → tuition, remittances, yield, portable record. *Money stays on licensed rails; trust travels with her.*

---

## References

[1] The Asian Banker, TAB Global AI Excellence Awards (WeBank), July 2026; WeBank press release via PR Newswire, 2026-07-21.
[2] Bank of America Global Research, agentic AI spending projections, June 2025.
[3] Mordor Intelligence, Agentic AI in Financial Services Market (2026–2031), September 2026.
[4] KPMG, enterprise AI agents survey, 2026 (99% plan vs 11% production).
[5] Deloitte, consumer survey on AI agents in personal finance, August 2026 (n≈2,600): 83% anxious; 66% risk outweighs benefit.
[6] Ping Identity, global consumer survey on AI agent trust, 2026 (n=11,000, 12 countries): 5% comfortable with approval; 42% cap at $100.
[7] FBI IC3, 2025 Internet Crime Report: $20.9B total; $11B+ crypto; AI-linked 22,364 complaints / ~$893M.
[8] U.S. CFTC customer advisory on AI trading-bot fraud; Mirror Trading International (~$1.7B).
[9] World Bank, Remittance Prices Worldwide, Q3 2025: 6.36% global average vs 3% SDG target; banks 13.64%.
[10] Financial Stability Board, G20 Roadmap progress report, 2025: 50.6% wholesale within one hour; Asia-Pacific 25.6%; >60% of B2B/B2P >1 business day.
[11] Bank for International Settlements / Bank of England cross-border payment frictions analyses (up to 10× domestic cost; per-hop compliance re-verification).
[12] Accredify, Singapore–Shenzhen cross-border data validation platform (FISCO BCOS, Baihang Credit), trial operations, January 2026.
[13] FISCO BCOS official documentation: EVM executor via EVMC; Solidity support; precompiled contracts.
[14] ERC-8004 standard (Ethereum Foundation / MetaMask / Google / Coinbase authors): identity, reputation, validation registries; CAIP-10 multichain identity; deployed on 20+ EVM chains, October 2025.
[15] FISCO BCOS whitepaper / open-source workgroup roster (WeBank, SSCC, Tencent, Huawei, Forms Syntron, 神州信息, Beyondsoft, 越秀金科, 亦笔科技); ecosystem disclosures: 5,000+ institutions, 100k+ developers, 600+ cases (end-2025).
[16] Deloitte Center for Financial Services: gen-AI fraud losses projected at $40B (US) by 2027.
[17] ECB / FXC Intelligence, June 2026: CIPS 2024 volume ¥175.49T (+43% YoY). Atlantic Council mBridge tracker, January 2026: $55.49B cumulative. SWIFT RMB Tracker, March 2026: RMB 8.46% of global trade finance. PBOC: e-CNY interest-bearing deposits from 2026-01-01.
[18] T.-M. Trong et al., "Verifiable AI Reviewers: Decentralized Skill Matching and Soulbound Reputation for Multi-Agent Peer Review," Proc. 9th International Conference on Multimedia Analysis and Pattern Recognition (MAPR 2026), August 2026. IEEE Xplore doc. 11685704. *(Team publication — first author.)*
[19] T.-D. Tran et al., "Lotus: A Hybrid Cross-Chain Framework for Privacy-Preserving Digital Identity," Proc. International Symposium on Communications and Information Technologies (ISCIT 2025), October 2025. IEEE Xplore doc. 11231625. *(Team publication — co-author.)*
