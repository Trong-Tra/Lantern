import Link from "next/link";
import type { Metadata } from "next";
import { API_ENDPOINTS, getApiBaseUrl } from "@lantern/config";
import { buildApiUrl, formatAddress, formatScore } from "@lantern/utils";
import { DemoBanner, NoticeCard, RiskBadge } from "@/components/molecules/explorer";
import { fetchAgentsPage, withQuery } from "@/libs/explorer/api";
import { formatUpdatedAt, parsePage } from "@/libs/explorer/present";

export const metadata: Metadata = { title: "Agent Explorer — Lattern" };

const PAGE_SIZE = 12;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const url = withQuery(buildApiUrl(API_ENDPOINTS.AGENTS, getApiBaseUrl()), {
    page,
    limit: PAGE_SIZE,
  });
  const result = await fetchAgentsPage(url, fetch);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-6">
        <Link href="/" className="font-mono text-xs text-lantern/80 hover:text-lantern">
          ← Home
        </Link>
        <h1 className="font-syne text-3xl text-paper">Agent Explorer</h1>
        <p className="mt-1 text-sm text-paper/60">
          ERC-8004 identities on Monad — discover, inspect, verify.
        </p>
      </header>

      <DemoBanner />

      {!result.ok ? (
        <div className="mt-6">
          <NoticeCard title="Couldn't load agents">
            {result.error} — is the API running? Start it with{" "}
            <code className="font-mono text-lantern">pnpm dev:api</code>.
          </NoticeCard>
        </div>
      ) : result.data.data.length === 0 ? (
        <div className="mt-6">
          <NoticeCard title="No agents yet">
            The registry is empty. Run the seed script (contracts/script/SeedAgents.s.sol) after
            deploying, or check back once the indexer is wired.
          </NoticeCard>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.data.map((agent) => (
              <li key={agent.agentId}>
                <Link
                  href={`/agent/${agent.agentId}`}
                  className="group block h-full rounded-xl border border-paper/15 bg-paper/[0.03] p-5 transition hover:border-lantern/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-syne text-lg text-paper transition group-hover:text-lantern">
                      {agent.name}
                    </h2>
                    <RiskBadge risk={agent.risk} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-paper/50">
                    #{agent.agentId} · {formatAddress(agent.owner)}
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-paper/40">Score</dt>
                      <dd className="font-mono text-sm text-paper">{formatScore(agent.score)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-paper/40">Execs</dt>
                      <dd className="font-mono text-sm text-paper">{agent.executions}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-paper/40">Fails</dt>
                      <dd className="font-mono text-sm text-paper">{agent.failures}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 font-mono text-[10px] text-paper/40">
                    Updated {formatUpdatedAt(agent.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          {result.data.totalPages > 1 ? (
            <nav className="mt-8 flex items-center justify-between font-mono text-sm">
              {result.data.page > 1 ? (
                <Link href={`/explore?page=${result.data.page - 1}`} className="text-lantern/80 hover:text-lantern">
                  ← Prev
                </Link>
              ) : (
                <span className="text-paper/30">← Prev</span>
              )}
              <span className="text-paper/50">
                Page {result.data.page} / {result.data.totalPages}
              </span>
              {result.data.page < result.data.totalPages ? (
                <Link href={`/explore?page=${result.data.page + 1}`} className="text-lantern/80 hover:text-lantern">
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
