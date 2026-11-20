"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { getApiBaseUrl } from "@lantern/config";
import { Skeleton } from "@/components/loading-skeleton";
import {
  fetchGqlAgents,
  toAgentRecord,
  type FetchLike,
} from "@/libs/app/graphql";
import { agentVerifyUrl, rankAgents, shortAddress, type AgentRecord } from "@/libs/app/network";

export type SolverMapProps = Readonly<{
  agents: readonly Readonly<{ id: string; label: string }>[];
  selection: Readonly<{ id: string; turn: number }>;
  onSelect: (id: string) => void;
  onDismiss: () => void;
}>;

const fetcher: FetchLike = (input, init) => fetch(input, init);

function FlipLabel({ label, previous }: Readonly<{
  label: string;
  previous: string;
}>) {
  const previousWords = previous.split(" ");
  return (
    <span className="app-scan-words">
      {label.split(" ").map((word, index) => (
        <span
          className="app-scan-word"
          key={index}
          style={{ "--word-delay": `${index * 85}ms` } as CSSProperties}
        >
          <span className="app-scan-word-from">{previousWords[index]}</span>
          <span className="app-scan-word-to">{word}</span>
        </span>
      ))}
    </span>
  );
}

function ScanMark({ label, reveal }: Readonly<{ label: string; reveal: string }>) {
  const mark = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState<boolean | null>(null);

  useEffect(() => {
    const link = mark.current?.parentElement;
    if (!link) return;

    let hovered = false;
    let timer: number | undefined;
    function update() {
      window.clearTimeout(timer);
      const next = hovered || Boolean(link?.matches(":focus-visible"));
      timer = window.setTimeout(() => setActive((current) => current === null && !next ? null : next), 200);
    }
    function enter(event: PointerEvent) {
      if (event.pointerType === "touch") return;
      hovered = true;
      update();
    }
    function leave() {
      hovered = false;
      update();
    }

    link.addEventListener("pointerenter", enter);
    link.addEventListener("pointerleave", leave);
    link.addEventListener("focus", update);
    link.addEventListener("blur", update);
    return () => {
      window.clearTimeout(timer);
      link.removeEventListener("pointerenter", enter);
      link.removeEventListener("pointerleave", leave);
      link.removeEventListener("focus", update);
      link.removeEventListener("blur", update);
    };
  }, []);

  return (
    <>
      <span className="app-scan-label" aria-hidden="true">
        {active === null ? label : (
          <FlipLabel key={String(active)} label={active ? reveal : label} previous={active ? label : reveal} />
        )}
      </span>
      <span ref={mark} className="app-scan-effects" aria-hidden="true">
        <span className="app-scan-mark" data-active={active === true}>
          <span className="app-scan-shaft" />
          <span className="app-scan-wave" />
        </span>
      </span>
    </>
  );
}

const DEMO_AGENTS = [
  { id: "a", label: "Aster", attestationCount: 128, rank: 1 },
  { id: "b", label: "Meridian", attestationCount: 97, rank: 2 },
  { id: "c", label: "Kestrel", attestationCount: 76, rank: 3 },
  { id: "d", label: "Tern", attestationCount: 53, rank: 4 },
  { id: "e", label: "Beacon", attestationCount: 41, rank: 5 },
  { id: "f", label: "Sable", attestationCount: 36, rank: 6 },
  { id: "g", label: "Lumen", attestationCount: 28, rank: 7 },
  { id: "h", label: "Vela", attestationCount: 21, rank: 8 },
  { id: "i", label: "Orion", attestationCount: 17, rank: 9 },
  { id: "j", label: "Halcyon", attestationCount: 12, rank: 10 },
].map((agent) => ({
  ...agent,
  owner: "",
  registeredAt: "",
  canonicalTokenId: null,
  about: null,
}));

export function AppNetwork({
  demo,
  limit,
  map: Map,
  rankFirst = false,
  standings,
}: Readonly<{
  demo: boolean;
  limit: number;
  map: ComponentType<SolverMapProps>;
  rankFirst?: boolean;
  standings?: ReadonlyArray<AgentRecord & { rank: number; about?: string | null }> | null;
}>) {
  const baseUrl = getApiBaseUrl();
  const query = useQuery({
    queryKey: ["app", "agents", baseUrl],
    queryFn: ({ signal }) => fetchGqlAgents(baseUrl, fetcher, signal),
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: 1,
    enabled: !demo && standings === undefined,
  });
  const [selection, setSelection] = useState({ id: "", turn: 0 });
  const ranked = useMemo(
    () =>
      demo
        ? DEMO_AGENTS.slice(0, limit)
        : (standings === undefined ? rankAgents((query.data ?? []).map(toAgentRecord)) : standings ?? [])
            .slice(0, limit)
            .map((agent) => ({
              ...agent,
              label: `Agent ${agent.id}`,
              about: "about" in agent ? agent.about : null,
            })),
    [demo, limit, query.data, standings],
  );
  const active = ranked.find(({ id }) => id === selection.id);

  function focusAgent(id: string) {
    setSelection(({ turn }) => ({ id, turn: turn + 1 }));
  }

  function closeCard() {
    setSelection(({ turn }) => ({ id: "", turn }));
  }

  const verifyUrl = active ? agentVerifyUrl(active) : null;
  return (
    <section
      className="app-network"
      aria-label="Solver network"
      onKeyDown={(event) => {
        if (event.key === "Escape") closeCard();
      }}
    >
      <Map
        agents={ranked}
        selection={{ id: active?.id ?? "", turn: selection.turn }}
        onSelect={focusAgent}
        onDismiss={closeCard}
      />

      {active ? (
        <section
          className="app-agent-overlay"
          aria-labelledby="app-agent-title"
        >
          <div
            key={selection.turn}
            className="app-hologram"
            data-reveal={selection.turn > 0}
          >
            <div aria-live="polite" aria-atomic="true">
              {!rankFirst && (
                <header className="app-id-header">
                  <span>Lantern Finance</span>
                  <span>{demo ? "Sample ID" : "Solver ID"}</span>
                </header>
              )}
              <div className="app-id-identity">
                {rankFirst ? (
                  <span className="app-id-rank">
                    <span className="sr-only">Rank </span>
                    <span className="app-id-rank-sign" aria-hidden="true">#</span>
                    {active.rank}
                  </span>
                ) : (
                  <span className="app-id-monogram" aria-hidden="true">
                    {demo ? active.label.slice(0, 2).toUpperCase() : "#"}
                  </span>
                )}
                <div>
                  <h2 id="app-agent-title">{active.label}</h2>
                  {rankFirst && typeof active.about === "string" && (
                    <p className="app-id-about">{active.about}</p>
                  )}
                  {rankFirst && demo && <p className="app-id-about">Fictional solver</p>}
                  {!rankFirst && <p>{demo ? "Fictional solver" : "Avalanche Fuji"}</p>}
                </div>
              </div>
              <button
                className="app-hologram-close"
                type="button"
                aria-label="Close agent details"
                onClick={closeCard}
              >
                <XMarkIcon aria-hidden="true" />
              </button>
              <dl className="app-agent-meta">
                {!rankFirst && (
                  <>
                    <div><dt>{demo ? "Sample identifier" : "Registry ID"}</dt><dd>{active.id}</dd></div>
                    <div><dt>Record source</dt><dd>{demo ? "Demo roster" : "Fuji registry"}</dd></div>
                    <div className="app-id-stat">
                      <dt>Rank</dt>
                      <dd>#{active.rank}</dd>
                    </div>
                  </>
                )}
                <div className="app-id-stat">
                  <dt>{demo ? "Sample attestations" : "Attestations"}</dt>
                  <dd>{active.attestationCount}</dd>
                </div>
                {(!demo || rankFirst) && (
                  <>
                    <div>
                      <dt>Owner</dt>
                      <dd>
                        {demo ? "—" : <code title={active.owner}>
                          {shortAddress(active.owner)}
                        </code>}
                      </dd>
                    </div>
                    <div>
                      <dt>Registered</dt>
                      <dd>{rankFirst
                        ? active.canonicalTokenId ? `#${active.canonicalTokenId}` : "—"
                        : active.registeredAt.slice(0, 10)}</dd>
                    </div>
                    {!rankFirst && active.canonicalTokenId && (
                      <div>
                        <dt>ERC-8004 token</dt>
                        <dd>#{active.canonicalTokenId}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
            </div>
            {verifyUrl ? (
              <a
                className="app-scan"
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${active.label} on 8004scan (opens in a new tab)`}
              >
                {rankFirst ? <ScanMark label="View on 8004scan" reveal="Check on 8004scan" /> : <>
                  View on 8004scan
                  <ArrowUpRightIcon aria-hidden="true" />
                </>}
              </a>
            ) : demo ? (
              <Link className="app-scan" href="/app?demo=0" aria-label="View live agents">
                {rankFirst ? <ScanMark label="View live agents" reveal="Open live roster" /> : "View live agents"}
              </Link>
            ) : (
              <p className="app-scan-unavailable">8004scan profile unavailable</p>
            )}
          </div>
        </section>
      ) : (
        ranked.length === 0 && (
          <aside
            className="app-state app-feed-status"
            aria-live="polite"
            aria-busy={standings === undefined && query.isPending}
          >
            {standings === undefined && query.isPending && (
              <>
                <p>Loading solver standings</p>
                <Skeleton className="loading-line" />
              </>
            )}
            {standings === null && <p>Registry feed offline</p>}
            {standings === undefined && query.isError && (
              <>
                <p>Registry feed offline</p>
                <button type="button" onClick={() => void query.refetch()}>
                  Retry registry feed
                </button>
              </>
            )}
            {(standings === undefined ? query.isSuccess : standings !== null) && <p>No agents registered</p>}
          </aside>
        )
      )}
    </section>
  );
}
