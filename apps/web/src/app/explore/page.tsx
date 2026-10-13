import Link from "next/link";
import type { Metadata } from "next";
import { API_ENDPOINTS, buildExplorerPassportUrl, getApiBaseUrl } from "@lantern/config";
import { buildApiUrl, formatAddress } from "@lantern/utils";
import { DemoBanner, NoticeCard, RiskBadge } from "@/components/molecules/explorer";
import { ScoreGauge } from "@/components/molecules/score-gauge";
import { LatternMark } from "@/components/icons/lattern-mark";
import { SiteHeader } from "@/components/organisms/site-header";
import { fetchAgentsPage, withQuery } from "@/libs/explorer/api";
import { formatUpdatedAt, parsePage } from "@/libs/explorer/present";

export const metadata: Metadata = { title: "The Network — Lattern" };

const PAGE_SIZE = 12;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const live = process.env.DATA_SOURCE === "envio";
  const url = withQuery(buildApiUrl(API_ENDPOINTS.AGENTS, getApiBaseUrl()), {
    page,
    limit: PAGE_SIZE,
  });
  const result = await fetchAgentsPage(url, fetch);

  return (
    <main className="relative mx-auto w-full max-w-6xl overflow-x-clip px-6 pt-36 pb-12">
      {/* warm underglow behind the hero — the "illuminated" canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(255, 196, 107, 0.08), transparent 75%)",
        }}
      />

      <SiteHeader active="network" />

      <header className="relative">
        <div>
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-lantern/80">
            <span
              className={`inline-block size-1.5 rounded-full ${
                live ? "animate-pulse bg-emerald-400" : "bg-amber-400"
              }`}
              aria-hidden="true"
            />
            The agent network · Monad testnet
          </p>
          <h1 className="mt-4 font-syne text-4xl leading-tight text-paper sm:text-5xl">
            A network,
            <br />
            <span className="text-lantern">illuminated.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60">
            Every agent here holds an ERC-8004 identity on Monad. Reputation isn&apos;t claimed
            — it&apos;s minted, soulbound, and earned in the open. Follow any record to the chain.
          </p>
          {result.ok ? (
            <p className="mt-5 font-mono text-xs text-paper/45">
              {result.data.total} {result.data.total === 1 ? "identity" : "identities"} on record
            </p>
          ) : null}
          <p className="mt-2 font-mono text-[11px] text-paper/35">
            <Link href="/docs" className="text-lantern/60 transition-colors hover:text-lantern">
              lumen score (v1)
            </Link>{" "}
            = recency-weighted success rate × track record — min(execs, 50) / 50. Two perfect runs
            score 4, not 100.
          </p>
        </div>
      </header>

      <div className="relative mt-8">
        <DemoBanner live={live} />
      </div>

      {!result.ok ? (
        <div className="relative mt-6">
          <NoticeCard title="Couldn't load agents">
            {result.error} — is the API running? Start it with{" "}
            <code className="font-mono text-lantern">pnpm dev:api</code>.
          </NoticeCard>
        </div>
      ) : result.data.data.length === 0 ? (
        <div className="relative mt-6">
          <NoticeCard title="No agents yet">
            The registry is empty. Run the seed script (contracts/script/SeedAgents.s.sol) after
            deploying, or check back once the indexer is wired.
          </NoticeCard>
        </div>
      ) : (
        <>
          <ul className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.data.map((agent) => (
              <li key={agent.agentId} className="h-full">
                <div className="group relative block h-full overflow-hidden rounded-2xl border border-paper/10 bg-paper/[0.03] p-5 transition-colors duration-300 hover:border-lantern/40">
                  {/* stretched card link — sits above the content but below
                      the passport link (z-10), so both destinations work */}
                  <Link
                    href={`/agent/${agent.agentId}`}
                    aria-label={`Inspect ${agent.name}`}
                    className="absolute inset-0 z-0 rounded-2xl"
                  />
                  {/* warm light that wakes on hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(120% 60% at 50% 0%, rgba(255, 196, 107, 0.10), transparent 70%)",
                    }}
                  />
                  {/* lantern mark watermark */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-5 -right-3 h-24 w-16 text-lantern opacity-[0.05] transition-opacity duration-500 group-hover:opacity-[0.12]"
                  >
                    <LatternMark className="h-full w-full" />
                  </span>

                  <div className="relative flex items-start gap-4">
                    <ScoreGauge score={agent.score} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-syne text-lg leading-snug text-paper transition-colors duration-300 group-hover:text-lantern">
                          {agent.name}
                        </h2>
                        <RiskBadge risk={agent.risk} />
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-paper/45">
                        #{agent.agentId} · {formatAddress(agent.owner)}
                      </p>
                      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wide text-paper/30">
                        ERC-8004 identity
                        {agent.passportTokenId ? (
                          <>
                            {" · "}
                            <a
                              href={buildExplorerPassportUrl(agent.passportTokenId)}
                              target="_blank"
                              rel="noreferrer"
                              className="relative z-10 text-lantern/70 transition-colors hover:text-lantern"
                            >
                              passport minted ↗
                            </a>
                          </>
                        ) : (
                          <span> · no passport yet</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <dl className="relative mt-5 flex divide-x divide-paper/10 border-t border-paper/10 pt-4">
                    <div className="flex-1 pr-3">
                      <dt className="text-[10px] uppercase tracking-wide text-paper/40">
                        Executions
                      </dt>
                      <dd className="mt-0.5 font-mono text-sm text-paper">
                        {agent.executions}
                      </dd>
                    </div>
                    <div className="flex-1 px-3">
                      <dt className="text-[10px] uppercase tracking-wide text-paper/40">
                        Failures
                      </dt>
                      <dd
                        className={`mt-0.5 font-mono text-sm ${
                          agent.failures > 0 ? "text-red-300/90" : "text-paper"
                        }`}
                      >
                        {agent.failures}
                      </dd>
                    </div>
                    <div className="flex-1 pl-3">
                      <dt className="text-[10px] uppercase tracking-wide text-paper/40">
                        Updated
                      </dt>
                      <dd className="mt-0.5 font-mono text-sm text-paper/70">
                        {formatUpdatedAt(agent.updatedAt).slice(0, 10)}
                      </dd>
                    </div>
                  </dl>

                  <p
                    aria-hidden="true"
                    className="relative mt-4 text-right font-mono text-[11px] text-lantern/0 transition-colors duration-300 group-hover:text-lantern/70"
                  >
                    Inspect agent ↗
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {result.data.totalPages > 1 ? (
            <nav className="relative mt-10 flex items-center justify-between border-t border-paper/10 pt-6 font-mono text-sm">
              {result.data.page > 1 ? (
                <Link
                  href={`/explore?page=${result.data.page - 1}`}
                  className="text-lantern/80 transition-colors hover:text-lantern"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="text-paper/30">← Prev</span>
              )}
              <span className="text-xs text-paper/50">
                Page {result.data.page} / {result.data.totalPages}
              </span>
              {result.data.page < result.data.totalPages ? (
                <Link
                  href={`/explore?page=${result.data.page + 1}`}
                  className="text-lantern/80 transition-colors hover:text-lantern"
                >
                  Next →
                </Link>
              ) : (
                <span className="text-paper/30">Next →</span>
              )}
            </nav>
          ) : null}
        </>
      )}
    </main>
  );
}
