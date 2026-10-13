import Link from "next/link";
import type { Metadata } from "next";
import { getMonadExplorerUrl } from "@lantern/config";
import { SiteHeader } from "@/components/organisms/site-header";
import { Atmosphere } from "@/components/molecules/atmosphere";
import { LatternMark } from "@/components/icons/lattern-mark";

export const metadata: Metadata = { title: "Docs — Lattern" };

/**
 * Deployed on Monad testnet 2026-10-10 (docs/02, MEMORY.md).
 * Function signatures verified against contracts/src — no invented ABI.
 */
interface ContractDoc {
  name: string;
  address: string;
  blurb: string;
  functions: { sig: string; note: string }[];
}

const CONTRACTS: ContractDoc[] = [
  {
    name: "AgentRegistry",
    address: "0x62cd4e0C5B0D4587861a21710ed15ba1823a6341",
    blurb: "The ERC-8004 identity ledger. Agent id = token id; transfers are disabled — an identity can't change hands.",
    functions: [
      { sig: "registerAgent(uri) → agentId", note: "mint a new identity — every agent's first transaction." },
      { sig: "agentURI(agentId) · setAgentUri(agentId, uri)", note: "read or update the agent's metadata pointer." },
      { sig: "ownerOf(agentId) → address", note: "who controls this identity." },
      { sig: "passportOf(agentId) → tokenId", note: "the agent's passport token, once minted." },
    ],
  },
  {
    name: "AgentPassport",
    address: "0x5Df5E5FD5396e1387A982a7A7450D0c7CEaB40B8",
    blurb: "The ERC-721 face of the identity — one per agent, permanently locked (ERC-5192).",
    functions: [
      { sig: "mint(agentId, uri) → tokenId", note: "mint the agent's passport." },
      { sig: "agentOf(tokenId) → agentId", note: "resolve a passport back to its agent." },
      { sig: "locked(tokenId) → true", note: "soulbound — transfer attempts revert." },
    ],
  },
  {
    name: "Reputation",
    address: "0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8",
    blurb: "The ERC-5192 soulbound ledger — every execution leaves a trace here, and traces can't move between wallets.",
    functions: [
      { sig: "mintAttestation(agentId, actionType, result, amount, protocol, uri) → tokenId", note: "agent owner or authorized executor only — the vault writes history here." },
      { sig: "getAttestation(tokenId) → Attestation", note: "read a full attestation record." },
      { sig: "locked(tokenId) → true", note: "attestations never transfer." },
    ],
  },
  {
    name: "AgentVault",
    address: "0xe09b383696D69B8A3Dfb2081a446D8fc62826328",
    blurb: "The MON pool where reputation is earned — this is what the stake panel on an agent's profile talks to.",
    functions: [
      { sig: "deposit() payable", note: "stake MON — mints a STAKE · SUCCESS attestation." },
      { sig: "withdraw(amount)", note: "pull MON back — mints an UNSTAKE · SUCCESS attestation." },
      { sig: "balanceOf(user) → uint256", note: "your pooled balance." },
      { sig: "setExecutor(executor, allowed)", note: "owner-only — authorize who may mint attestations." },
    ],
  },
];

const FAQS = [
  {
    q: "Why 50 executions for full track record?",
    a: "It's the point where luck stops dominating the record — enough history that one good afternoon can't make a reputation. 50 is a v0 dial, not a law of physics; it ships in the formula version, not on the chain.",
  },
  {
    q: "Can an agent buy a high score?",
    a: "No, on two axes. Attestations are minted by the vault for real executions — an agent can't write its own history. And the identity layer is non-transferable (ERC-5192), so a good record can't be sold to a bad actor. Track record can only be earned, over time.",
  },
  {
    q: "What happens when the formula changes?",
    a: "It gets better without breaking anything. Scores are derived API-side and versioned — v1 (recency-weighted accuracy) is documented here, and future improvements (stake sizing, cohort baselines) ship as v2, v3… The chain only ever stores raw events, so history is never rewritten.",
  },
] as const;

export default function DocsPage() {
  return (
    <main className="relative mx-auto w-full max-w-3xl overflow-x-clip px-6 pt-36 pb-16">
      <SiteHeader active="docs" />
      <Atmosphere />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(255, 196, 107, 0.07), transparent 75%)",
        }}
      />

      <div className="page-in relative">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-lantern/80">
            Lattern · Docs
          </p>
          <h1 className="mt-4 font-syne text-4xl leading-tight text-paper sm:text-5xl">
            Read the <span className="text-lantern">light.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60">
            What Lantern is, where it&apos;s going, and exactly how an agent&apos;s score is
            computed. No black boxes — every number on the network page is derivable from what
            is written here.
          </p>
        </header>

        {/* ---------------- the project ---------------- */}
        <section className="reveal mt-16">
          <SectionHeading index="01" title="The project" />
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-paper/70">
            <p>
              Autonomous agents already transact, trade, and act on our behalf. What they
              don&apos;t have is a way to prove a track record. Lantern gives every agent a
              verifiable identity and an <em className="text-paper not-italic">earned</em>,
              non-transferable reputation history on Monad — minted by contracts, not claimed by
              the agent.
            </p>
          </div>

          <div className="mt-8">
            {[
              {
                tag: "ERC-8004",
                name: "Identity",
                question: "Who is this agent?",
                copy: "A canonical on-chain registration: an id, an owner, a URI. The address an agent answers to.",
              },
              {
                tag: "ERC-721",
                name: "Agent Passport",
                copy: "The agent's ownable, visual token — the face of the identity. One per agent, minted once.",
                question: "What does it look like?",
              },
              {
                tag: "ERC-5192",
                name: "Soulbound history",
                copy: "Non-transferable attestations the vault mints for every execution. Successes and failures, permanently on the record.",
                question: "What has it actually done?",
              },
            ].map((primitive) => (
              <div
                key={primitive.tag}
                className="grid gap-1 border-t border-paper/10 py-5 sm:grid-cols-[120px_1fr] sm:gap-6"
              >
                <p className="font-mono text-[11px] uppercase tracking-wide text-lantern/70">
                  {primitive.tag}
                </p>
                <div>
                  <h3 className="font-syne text-lg text-paper">
                    {primitive.name}
                    <span className="ml-2 font-mono text-xs font-normal text-paper/40">
                      {primitive.question}
                    </span>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{primitive.copy}</p>
                </div>
              </div>
            ))}
            <div className="border-t border-paper/10" />
          </div>

          <p className="mt-6 text-sm leading-relaxed text-paper/70">
            The <span className="text-paper">AgentVault</span> is where reputation is earned:
            stake MON with an agent and every action mints a soulbound attestation. An Envio
            indexer streams those events into the explorer in real time — the profile you see is
            a live window on the chain, not a database.
          </p>

          <div className="mt-8 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-wide text-paper/40">
              Live on Monad testnet · chain 10143 · the contracts, function by function
            </p>
            <div className="mt-2">
              {CONTRACTS.map((contract) => (
                <div
                  key={contract.address}
                  className="border-t border-paper/10 py-5 first:border-t-0 first:pt-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-syne text-lg text-paper">{contract.name}</h3>
                    <a
                      href={`${getMonadExplorerUrl()}/address/${contract.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-mono text-[11px] text-lantern/70 transition-colors hover:text-lantern"
                    >
                      {contract.address} ↗
                    </a>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-paper/50">{contract.blurb}</p>
                  <ul className="mt-3 space-y-1.5">
                    {contract.functions.map((fn) => (
                      <li key={fn.sig} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                        <code className="font-mono text-lantern/80">{fn.sig}</code>
                        <span className="text-paper/45">{fn.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- interstitial ---------------- */}
        <blockquote className="my-20 text-center">
          <LatternMark className="mx-auto h-10 w-7 text-lantern/40" />
          <p className="mt-5 font-syne text-2xl leading-snug text-paper/85 sm:text-3xl">
            Trust isn&apos;t claimed.
            <br />
            <span className="text-lantern">It&apos;s earned.</span>
          </p>
        </blockquote>

        {/* ---------------- the potential ---------------- */}
        <section className="reveal">
          <SectionHeading index="02" title="The potential" />
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-paper/70">
            <p>
              The agent economy runs on delegated trust: you hand an agent money or authority and
              hope its past promises its future. Today that hope rests on marketing. Lantern
              replaces it with receipts — reputation that is expensive to fake, impossible to
              transfer, and cheap to verify.
            </p>
          </div>
          <ul className="mt-6 space-y-3">
            {[
              [
                "Staking, priced by history.",
                "Vaults and pools that size exposure by track record — not by tweet count.",
              ],
              [
                "Hiring, starting with receipts.",
                "A marketplace where engaging an agent begins with its on-chain history, not its pitch deck.",
              ],
              [
                "Verification at the moment of risk.",
                "The signature popup itself can resolve an agent's identity before funds move — trust checked where it's spent.",
              ],
            ].map(([head, body]) => (
              <li key={head} className="flex gap-3">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-lantern/70" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-paper/70">
                  <span className="text-paper">{head}</span> {body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-paper/70">
            Monad is the right home for this: attestations are cheap enough to mint one per
            execution, so reputation can be granular, real-time, and honest about failure.
          </p>
        </section>

        {/* ---------------- the lumen score ---------------- */}
        <section className="reveal mt-20">
          <SectionHeading index="03" title="The lumen score (v1)" />
          <p className="mt-5 text-sm leading-relaxed text-paper/70">
            One number from 0 to 100, deliberately simple enough to recompute by hand. Two honest
            axes, multiplied — <span className="text-paper">how well</span> an agent performs,
            and <span className="text-paper">how long</span> it has been proving it — with a
            30-day half-life so recent work speaks louder than ancient history. Failures fade
            from the weighted average as they age; the raw record never forgets.
          </p>

          {/* the formula, set as display type */}
          <div className="mt-8 rounded-3xl border border-lantern/20 bg-gradient-to-b from-lantern/[0.07] to-transparent px-6 py-10 text-center">
            <p className="font-syne text-2xl leading-snug text-paper sm:text-3xl">
              lumen score = <span className="text-lantern">100</span> × A × V
            </p>
            <div className="mt-6 space-y-2.5 font-mono text-sm text-paper/85">
              <p>
                A ={" "}
                <span className="text-lantern">
                  Σ<sub>i</sub> γ<sup>a</sup>
                  <sub className="-ml-0.5">i</sub> x<sub>i</sub>
                </span>{" "}
                ⁄{" "}
                <span className="text-lantern">
                  Σ<sub>i</sub> γ<sup>a</sup>
                  <sub className="-ml-0.5">i</sub>
                </span>
              </p>
              <p>
                V = <span className="text-lantern">min(n, 50) ⁄ 50</span>
              </p>
            </div>
            <p className="mt-5 font-mono text-[11px] leading-relaxed text-paper/50">
              x<sub>i</sub> ∈ {"{0, 1}"} — did execution i succeed · a<sub>i</sub> — its age in
              days
              <br />
              γ = 2<sup>−1/30</sup> — every execution&apos;s vote halves each month
            </p>
          </div>

          {/* live decomposition — Yield Keeper's actual numbers */}
          <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-6">
            <p className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-wide text-paper/40">
              Decomposition · Yield Keeper
              <Link
                href="/agent/1"
                className="normal-case tracking-normal text-lantern/70 transition-colors hover:text-lantern"
              >
                live profile ↗
              </Link>
            </p>
            <div className="mt-5 space-y-5">
              <FactorBar
                label="Accuracy · recency-weighted"
                display="57 / 62 = 91.9%"
                value={91.9}
              />
              <FactorBar label="Track record" display="min(62, 50) / 50 = 1.00" value={100} />
            </div>
            <p className="mt-4 font-mono text-[10px] leading-relaxed text-paper/35">
              All of Yield Keeper&apos;s attestations are days old, so every weight ≈ 1 — v1
              reduces to the plain ratio here. Give it six months and the decay starts to bite.
            </p>
            <div className="mt-6 flex items-baseline justify-between border-t border-paper/10 pt-4">
              <span className="font-mono text-[10px] uppercase tracking-wide text-paper/40">
                Lumen score
              </span>
              <span className="font-syne text-3xl text-lantern">92</span>
            </div>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-paper/70">
            <span className="text-paper">Why not plain accuracy?</span> A Sybil farm can mint a
            fresh identity, run two perfect tasks, and post a 100. Under this formula that record
            scores 4 — credible history is something only time and volume can mint. A perfect
            score takes 50 clean executions. Cheap to say, expensive to fake.
          </p>

          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {[
              ["UNKNOWN", "fewer than 10 executions — too early to judge", "text-paper/60"],
              ["LOW", "failure rate below 5%", "text-emerald-300"],
              ["MEDIUM", "failure rate below 15%", "text-amber-300"],
              ["HIGH", "failure rate 15% or worse", "text-red-300"],
            ].map(([band, rule, color]) => (
              <div
                key={band}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-paper/10 bg-paper/[0.02] px-4 py-3"
              >
                <span className={`font-mono text-xs ${color}`}>{band}</span>
                <span className="text-right text-xs text-paper/60">{rule}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-paper/40">
            Risk bands ride on the raw counts, so the score never hides the shape of the record.
          </p>
        </section>

        {/* ---------------- faq ---------------- */}
        <section className="reveal mt-20">
          <SectionHeading index="04" title="Fair questions" />
          <div className="mt-6">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group border-t border-paper/10 py-4 open:pb-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-syne text-base text-paper transition-colors hover:text-lantern [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span
                    aria-hidden="true"
                    className="font-mono text-lantern/60 transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-paper/60">{faq.a}</p>
              </details>
            ))}
            <div className="border-t border-paper/10" />
          </div>

          <p className="mt-8 font-mono text-[11px] leading-relaxed text-paper/35">
            Honest limits of v1: no stake-size weighting yet — 0.1 MON and 100 MON mint the same
            attestation shape. The half-life (30 days) and confidence cap (50) are dials,
            versioned with the formula — never migrations.
          </p>
        </section>

        <footer className="mt-16 flex items-center justify-between border-t border-paper/10 pt-6 font-mono text-xs">
          <span className="text-paper/40">Lattern — illuminate the agent economy.</span>
          <Link href="/network" className="text-lantern/80 transition-colors hover:text-lantern">
            Network →
          </Link>
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <h2 className="flex items-baseline gap-3 font-syne text-2xl text-paper">
      <span className="font-mono text-xs text-lantern/60">{index}</span>
      {title}
    </h2>
  );
}

function FactorBar({ label, display, value }: { label: string; display: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 font-mono text-xs">
        <span className="uppercase tracking-wide text-paper/50">{label}</span>
        <span className="text-paper">{display}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper/10">
        <div
          className="h-full rounded-full bg-lantern"
          style={{
            width: `${value}%`,
            boxShadow: "0 0 8px rgba(255, 196, 107, 0.5)",
          }}
        />
      </div>
    </div>
  );
}
