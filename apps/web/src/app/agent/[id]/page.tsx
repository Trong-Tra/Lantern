import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import {
  API_ENDPOINTS,
  buildExplorerPassportUrl,
  buildExplorerTxUrl,
  getApiBaseUrl,
} from "@lantern/config";
import { buildApiUrl, formatAddress } from "@lantern/utils";
import { AgentChatPanel, DemoBanner, NoticeCard, RiskBadge, VaultPanel } from "@/components/molecules";
import { ScoreGauge } from "@/components/molecules/score-gauge";
import { SiteHeader } from "@/components/organisms/site-header";
import { Atmosphere } from "@/components/molecules/atmosphere";
import { fetchAgentProfile, fetchRiskReport } from "@/libs/explorer/api";
import { formatUpdatedAt, parseAgentId, parsePage } from "@/libs/explorer/present";

export const metadata: Metadata = { title: "Agent profile — Lattern" };

const ATT_PAGE_SIZE = 10;

function endpoint(template: string, agentId: number): string {
  return buildApiUrl(template.replace(":id", String(agentId)), getApiBaseUrl());
}

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const { id } = routeParams;
  const agentId = parseAgentId(id);
  const attPage = parsePage(query.attPage);
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
  const totalAttPages = Math.max(1, Math.ceil(profile.attestations.length / ATT_PAGE_SIZE));
  const safeAttPage = Math.min(attPage, totalAttPages);
  const pageAttestations = profile.attestations.slice(
    (safeAttPage - 1) * ATT_PAGE_SIZE,
    safeAttPage * ATT_PAGE_SIZE,
  );

  return (
    <Shell>
      <header className="relative">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-lantern/80">
              Agent · ERC-8004 #{profile.agentId}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="font-syne text-4xl leading-tight text-paper">{profile.name}</h1>
              <RiskBadge risk={profile.risk} />
            </div>
            <p className="mt-2 font-mono text-xs text-paper/50">
              {formatAddress(profile.owner, 6)} · updated {formatUpdatedAt(profile.updatedAt).slice(0, 10)}
            </p>
            <p className="mt-1.5 font-mono text-[11px] break-all text-paper/30">
              {profile.identityUri}
              {profile.passportTokenId !== undefined ? (
                <>
                  {" · passport "}
                  <a
                    href={buildExplorerPassportUrl(profile.passportTokenId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lantern/70 transition-colors hover:text-lantern"
                  >
                    #{profile.passportTokenId} on Monadscan ↗
                  </a>
                </>
              ) : null}
            </p>
            {profile.bio ? (
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60">{profile.bio}</p>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <ScoreGauge score={profile.score} size={96} />
            <span className="font-mono text-[10px] uppercase tracking-wide text-paper/40">
              lumen score
            </span>
          </div>
        </div>
      </header>

      <div className="mt-6">
        <DemoBanner live={live} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        {/* ---------------- main column ---------------- */}
        <div className="min-w-0">
          <section className="reveal rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
            <h2 className="font-syne text-lg text-paper">On record</h2>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <dl className="grid flex-1 grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-paper/40">Executions</dt>
                  <dd className="mt-0.5 font-mono text-paper">{profile.executions}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-paper/40">Failures</dt>
                  <dd
                    className={`mt-0.5 font-mono ${
                      profile.failures > 0 ? "text-red-300/90" : "text-paper"
                    }`}
                  >
                    {profile.failures}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-paper/40">Updated</dt>
                  <dd className="mt-0.5 font-mono text-paper/70">
                    {formatUpdatedAt(profile.updatedAt).slice(0, 10)}
                  </dd>
                </div>
              </dl>
            </div>

            {riskResult.ok ? (
              <div className="mt-4 border-t border-paper/10 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-wide text-paper/40">
                  Why this risk band
                </p>
                <ul className="mt-2 space-y-1 text-sm text-paper/70">
                  {riskResult.data.reasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span className="text-lantern/60" aria-hidden="true">
                        ·
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-sm text-paper/60">Risk unavailable: {riskResult.error}</p>
            )}
          </section>

          <section className="reveal mt-4 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-syne text-lg text-paper">Attestation history</h2>
              <p className="font-mono text-[11px] text-paper/40">
                ERC-5192 soulbound mints, newest first
              </p>
            </div>

            {pageAttestations.length === 0 ? (
              <p className="mt-4 text-sm text-paper/60">No attestations yet.</p>
            ) : (
              <>
                <ol className="mt-4 space-y-2">
                  {pageAttestations.map((attestation) => (
                    <li
                      key={attestation.tokenId}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-paper/10 bg-ink/40 px-4 py-3 text-sm transition-colors hover:border-lantern/30"
                    >
                      <span className="font-mono text-xs text-paper/40">
                        #{attestation.tokenId}
                      </span>
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
                      <span className="ml-auto font-mono text-[11px] text-paper/40">
                        {formatUpdatedAt(attestation.timestamp)}
                      </span>
                      {attestation.txHash ? (
                        <a
                          href={buildExplorerTxUrl(attestation.txHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-lantern/80 transition-colors hover:text-lantern"
                        >
                          tx ↗
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ol>

                {totalAttPages > 1 ? (
                  <nav className="mt-4 flex items-center justify-between border-t border-paper/10 pt-4 font-mono text-xs">
                    {safeAttPage > 1 ? (
                      <Link
                        href={`/agent/${agentId}?attPage=${safeAttPage - 1}`}
                        className="text-lantern/80 transition-colors hover:text-lantern"
                      >
                        ← Newer
                      </Link>
                    ) : (
                      <span className="text-paper/30">← Newer</span>
                    )}
                    <span className="text-paper/50">
                      {(safeAttPage - 1) * ATT_PAGE_SIZE + 1}–
                      {Math.min(safeAttPage * ATT_PAGE_SIZE, profile.attestations.length)} of{" "}
                      {profile.attestations.length}
                    </span>
                    {safeAttPage < totalAttPages ? (
                      <Link
                        href={`/agent/${agentId}?attPage=${safeAttPage + 1}`}
                        className="text-lantern/80 transition-colors hover:text-lantern"
                      >
                        Older →
                      </Link>
                    ) : (
                      <span className="text-paper/30">Older →</span>
                    )}
                  </nav>
                ) : null}
              </>
            )}
          </section>
        </div>

        {/* ---------------- sticky sidebar: stake + chat ---------------- */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6">
          <VaultPanel agentId={profile.agentId} />
          <AgentChatPanel agentId={profile.agentId} agentName={profile.name} />
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-x-clip px-6 pt-36 pb-12">
      <SiteHeader active="network" />
      <Atmosphere />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(255, 196, 107, 0.06), transparent 75%)",
        }}
      />
      <div className="page-in relative">{children}</div>
    </main>
  );
}
