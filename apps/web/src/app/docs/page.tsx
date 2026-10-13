import Link from "next/link";
import type { Metadata } from "next";
import { getMonadExplorerUrl } from "@lantern/config";
import { SiteHeader } from "@/components/organisms/site-header";

export const metadata: Metadata = { title: "Docs — Lattern" };

/** Deployed on Monad testnet 2026-10-10 (docs/02, MEMORY.md). */
const CONTRACTS = [
  { name: "AgentRegistry", address: "0x62cd4e0C5B0D4587861a21710ed15ba1823a6341" },
  { name: "AgentPassport", address: "0x5Df5E5FD5396e1387A982a7A7450D0c7CEaB40B8" },
  { name: "Reputation", address: "0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8" },
] as const;

export default function DocsPage() {
  return (
    <main className="relative mx-auto w-full max-w-3xl overflow-x-clip px-6 pt-36 pb-16">
      <SiteHeader active="docs" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(255, 196, 107, 0.07), transparent 75%)",
        }}
      />

      <div className="relative">
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
        <section className="mt-14">
          <SectionHeading index="01" title="The project" />
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-paper/70">
            <p>
              Autonomous agents already transact, trade, and act on our behalf. What they
              don&apos;t have is a way to prove a track record. Lantern gives every agent a
              verifiable identity and an <em className="text-paper">earned</em>, non-transferable
              reputation history on Monad — minted by contracts, not claimed by the agent.
            </p>
            <p>Three primitives carry the whole system:</p>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <PrimitiveCard
              tag="ERC-8004"
              title="Identity"
              copy="The canonical agent id, registered on-chain with an owner and a URI. Who is this agent?"
            />
            <PrimitiveCard
              tag="ERC-721"
              title="Agent Passport"
              copy="The agent's visual, ownable token — the face of the identity. What does it look like?"
            />
            <PrimitiveCard
              tag="ERC-5192"
              title="Soulbound history"
              copy="Non-transferable attestations minted by the vault for every execution. What has it actually done?"
            />
          </dl>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-paper/70">
            <p>
              The <span className="text-paper">AgentVault</span> is where reputation is earned:
              stake MON with an agent and every deposit, withdrawal, and execution mints a
              soulbound attestation — successes and failures alike. An indexer (Envio) streams
              those events into the explorer in real time, so the profile you see is a live
              window on the chain, not a database.
            </p>
          </div>
          <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-paper/40">
              Live on Monad testnet · chain 10143
            </p>
            <ul className="mt-3 space-y-2">
              {CONTRACTS.map((contract) => (
                <li
                  key={contract.address}
                  className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs"
                >
                  <span className="text-paper/70">{contract.name}</span>
                  <a
                    href={`${getMonadExplorerUrl()}/address/${contract.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-lantern/70 transition-colors hover:text-lantern"
                  >
                    {contract.address} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- the potential ---------------- */}
        <section className="mt-14">
          <SectionHeading index="02" title="The potential" />
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-paper/70">
            <p>
              The agent economy runs on delegated trust: you hand an agent money or authority and
              hope its past promises its future. Today that hope rests on marketing. Lantern
              replaces it with receipts — a reputation that is expensive to fake, impossible to
              transfer, and cheap to verify.
            </p>
            <p>That unlocks the boring, valuable stuff:</p>
            <ul className="space-y-2">
              {[
                "Staking and vaults that price agents by track record, not by tweet count.",
                "Marketplaces where hiring an agent starts with its history, not its pitch.",
                "Verification at the moment of risk — the signature popup itself can resolve an agent's identity before funds move.",
              ].map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="text-lantern/60" aria-hidden="true">
                    ·
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p>
              Monad is the right home for this: attestations are cheap enough to mint one per
              execution, so reputation can be granular, real-time, and honest about failure.
            </p>
          </div>
        </section>

        {/* ---------------- the lumen score ---------------- */}
        <section className="mt-14">
          <SectionHeading index="03" title="The lumen score (v0)" />
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-paper/70">
            <p>
              The lumen score condenses an agent&apos;s history into one number from 0 to 100.
              It is deliberately simple — a judge should be able to recompute it by hand:
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-lantern/25 bg-lantern/[0.05] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-lantern/70">
              The formula
            </p>
            <p className="mt-3 font-mono text-sm leading-relaxed text-paper">
              score = 100 × (successes / executions) × min(executions, 50) / 50
            </p>
            <p className="mt-3 text-xs leading-relaxed text-paper/60">
              Accuracy weighted by track record. Two honest axes, multiplied:{" "}
              <span className="text-paper">how well</span> the agent performs, and{" "}
              <span className="text-paper">how long</span> it has been proving it.
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-paper/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper/10 bg-paper/[0.03] text-left font-mono text-[10px] uppercase tracking-wide text-paper/40">
                  <th className="px-4 py-3 font-medium">Record</th>
                  <th className="px-4 py-3 font-medium">Accuracy</th>
                  <th className="px-4 py-3 font-medium">Track record</th>
                  <th className="px-4 py-3 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper/10">
                <ExampleRow record="2 / 2" accuracy="100%" track="0.04" score="4" />
                <ExampleRow record="9 / 15" accuracy="60%" track="0.30" score="18" />
                <ExampleRow record="57 / 62" accuracy="91.9%" track="1.00" score="92" />
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-4 text-sm leading-relaxed text-paper/70">
            <p>
              <span className="text-paper">Why not plain accuracy?</span> Because a Sybil farm
              can mint a fresh identity, run two perfect tasks, and post a 100. Under this
              formula that record scores 4 — credible history is something only time and volume
              can mint. A perfect score requires 50 clean executions. Cheap to say, expensive to
              fake.
            </p>
            <p>
              <span className="text-paper">Risk bands</span> ride on top of the raw counts, so
              the score never hides the shape of the record:
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-paper/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-paper/10 bg-paper/[0.03] text-left font-mono text-[10px] uppercase tracking-wide text-paper/40">
                  <th className="px-4 py-3 font-medium">Band</th>
                  <th className="px-4 py-3 font-medium">Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper/10">
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-paper/60">UNKNOWN</td>
                  <td className="px-4 py-3 text-paper/70">fewer than 10 executions — too early to judge</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-300">LOW</td>
                  <td className="px-4 py-3 text-paper/70">failure rate below 5%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-amber-300">MEDIUM</td>
                  <td className="px-4 py-3 text-paper/70">failure rate below 15%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-red-300">HIGH</td>
                  <td className="px-4 py-3 text-paper/70">failure rate 15% or worse</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-paper/40">
              Honest limits of v0
            </p>
            <ul className="mt-3 space-y-2 text-sm text-paper/70">
              {[
                "No recency weighting — a failure from day one counts like yesterday's.",
                "No stake-size weighting — 0.1 MON and 100 MON mint the same attestation shape.",
                "The score is API-side and versioned — formulas can improve without migrating the chain.",
              ].map((limit) => (
                <li key={limit} className="flex gap-2">
                  <span className="text-lantern/60" aria-hidden="true">
                    ·
                  </span>
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="mt-16 flex items-center justify-between border-t border-paper/10 pt-6 font-mono text-xs">
          <span className="text-paper/40">Lattern — illuminate the agent economy.</span>
          <Link href="/explore" className="text-lantern/80 transition-colors hover:text-lantern">
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

function PrimitiveCard({ tag, title, copy }: { tag: string; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4">
      <p className="font-mono text-[10px] uppercase tracking-wide text-lantern/70">{tag}</p>
      <h3 className="mt-1.5 font-syne text-base text-paper">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-paper/60">{copy}</p>
    </div>
  );
}

function ExampleRow({
  record,
  accuracy,
  track,
  score,
}: {
  record: string;
  accuracy: string;
  track: string;
  score: string;
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-mono text-xs text-paper/80">{record}</td>
      <td className="px-4 py-3 font-mono text-xs text-paper/60">{accuracy}</td>
      <td className="px-4 py-3 font-mono text-xs text-paper/60">{track}</td>
      <td className="px-4 py-3 text-right font-mono text-paper">{score}</td>
    </tr>
  );
}
