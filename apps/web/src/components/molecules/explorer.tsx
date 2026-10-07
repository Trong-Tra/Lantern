import type { ReactNode } from "react";
import type { RiskLevel } from "@lantern/types";
import { riskTone, type RiskTone } from "@/libs/explorer/present";

const TONE_STYLES: Record<RiskTone, string> = {
  low: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  medium: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  high: "border-red-400/40 bg-red-400/10 text-red-300",
  unknown: "border-paper/25 bg-paper/5 text-paper/60",
};

export function RiskBadge({ risk }: { risk: RiskLevel | string }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] tracking-wide ${TONE_STYLES[riskTone(risk)]}`}
    >
      {risk.toUpperCase()}
    </span>
  );
}

/**
 * Honest-data guard (docs/06): the API serves quarantined mock records until
 * the Envio indexer lands — every explorer screen must say so out loud.
 */
export function DemoBanner() {
  return (
    <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200/90">
      Demo data — the API currently serves quarantined mock records until the Envio indexer is wired
      (docs/03). Nothing shown here is live chain data.
    </p>
  );
}

export function NoticeCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="rounded-xl border border-paper/15 bg-paper/[0.03] p-6">
      <h2 className="font-syne text-lg text-paper">{title}</h2>
      {children ? <div className="mt-2 text-sm text-paper/70">{children}</div> : null}
    </section>
  );
}
