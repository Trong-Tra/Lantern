import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { API_ENDPOINTS, buildExplorerTxUrl, getApiBaseUrl } from "@lantern/config";
import { buildApiUrl, formatAddress, formatScore } from "@lantern/utils";
import { AgentChatPanel, DemoBanner, NoticeCard, RiskBadge } from "@/components/molecules";
import { fetchAgentProfile, fetchRiskReport } from "@/libs/explorer/api";
import { formatUpdatedAt, parseAgentId } from "@/libs/explorer/present";

export const metadata: Metadata = { title: "Agent profile — Lattern" };

function endpoint(template: string, agentId: number): string {
  return buildApiUrl(template.replace(":id", String(agentId)), getApiBaseUrl());
}

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agentId = parseAgentId(id);
  const live = process.env.DATA_SOURCE === "envio";

  if (agentId === null) {
    return (
      <Shell>
        <NoticeCard title="Invalid agent id">
          Agent ids are positive integers — try{" "}
          <Link href="/explore" className="text-lantern underline">
            the explorer
          </Link>
          .
        </NoticeCard>
      </Shell>
    );
  }

  const [profileResult, riskResult] = await Promise.all([
    fetchAgentProfile(endpoint(API_ENDPOINTS.AGENT_BY_ID, agentId), fetch),
    fetchRiskReport(endpoint(API_ENDPOINTS.AGENT_RISK, agentId), fetch),
  ]);

  if (!profileResult.ok) {
    return (
      <Shell>
        <NoticeCard title={profileResult.status === 404 ? "Agent not found" : "Couldn't load agent"}>
          {profileResult.status === 404
            ? `No ERC-8004 identity #${agentId} is registered (yet).`
            : `${profileResult.error} — is the API running? Start it with pnpm dev:api.`}
        </NoticeCard>
      </Shell>
    );
  }

  const profile = profileResult.data;

  return (
    <Shell>
      <header className="mb-6">
        <Link href="/explore" className="font-mono text-xs text-lantern/80 hover:text-lantern">
          ← Explorer
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-syne text-3xl text-paper">{profile.name}</h1>
          <RiskBadge risk={profile.risk} />
        </div>
        <p className="mt-1 font-mono text-xs text-paper/50">
          ERC-8004 #{profile.agentId} · {formatAddress(profile.owner, 6)}
        </p>
        {profile.bio ? <p className="mt-2 max-w-2xl text-sm text-paper/70">{profile.bio}</p> : null}
      </header>

      <DemoBanner live={live} />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-paper/15 bg-paper/[0.03] p-5">
          <h2 className="font-syne text-lg text-paper">On record</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Score" value={formatScore(profile.score)} />
            <Row label="Executions" value={String(profile.executions)} />
            <Row label="Failures" value={String(profile.failures)} />
            <Row label="Updated" value={formatUpdatedAt(profile.updatedAt)} />
          </dl>
        </section>

        <section className="rounded-xl border border-paper/15 bg-paper/[0.03] p-5">
          <h2 className="font-syne text-lg text-paper">Risk</h2>
          {riskResult.ok ? (
            <>
              <div className="mt-3">
                <RiskBadge risk={riskResult.data.risk} />
              </div>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-paper/70">
                {riskResult.data.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-paper/60">Unavailable: {riskResult.error}</p>
          )}
        </section>

        <section className="rounded-xl border border-paper/15 bg-paper/[0.03] p-5">
          <h2 className="font-syne text-lg text-paper">Identity</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-paper/40">Agent URI</dt>
              <dd className="mt-0.5 font-mono text-xs break-all text-paper/80">
                {profile.identityUri}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-paper/40">Passport</dt>
              <dd className="mt-0.5 font-mono text-xs break-all text-paper/80">
                {profile.passportTokenId !== undefined ? (
                  <>
                    #{profile.passportTokenId} · {profile.passportUri ?? "uri TBD"}
                  </>
                ) : (
                  <span className="text-paper/50">Not minted yet</span>
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-paper/15 bg-paper/[0.03] p-5">
        <h2 className="font-syne text-lg text-paper">Attestation history</h2>
        <p className="mt-1 text-xs text-paper/50">
          ERC-5192 soulbound mints, newest first — successes and failures both count.
        </p>
        {profile.attestations.length === 0 ? (
          <p className="mt-4 text-sm text-paper/60">No attestations yet.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {profile.attestations.map((attestation) => (
              <li
                key={attestation.tokenId}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-paper/10 bg-ink/40 px-4 py-3 text-sm"
              >
                <span className="font-mono text-xs text-paper/40">#{attestation.tokenId}</span>
                <span className="font-mono text-xs tracking-wide text-lantern">
                  {attestation.actionType}
                </span>
                <span
                  className={
                    attestation.result === "SUCCESS"
                      ? "rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-[11px] text-emerald-300"
                      : "rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 font-mono text-[11px] text-red-300"
                  }
                >
                  {attestation.result}
                </span>
                {attestation.protocol ? (
                  <span className="text-xs text-paper/60">{attestation.protocol}</span>
                ) : null}
                {attestation.amount ? (
                  <span className="font-mono text-xs break-all text-paper/50">
                    {attestation.amount}
                  </span>
                ) : null}
                <span className="ml-auto font-mono text-[11px] text-paper/40">
                  {formatUpdatedAt(attestation.timestamp)}
                </span>
                {attestation.txHash ? (
                  <a
                    href={buildExplorerTxUrl(attestation.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-lantern/80 hover:text-lantern"
                  >
                    tx ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-4">
        <AgentChatPanel agentId={profile.agentId} agentName={profile.name} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-xs text-lantern/80 hover:text-lantern">
        ← Home
      </Link>
      {children}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] uppercase tracking-wide text-paper/40">{label}</dt>
      <dd className="font-mono text-sm text-paper">{value}</dd>
    </div>
  );
}
