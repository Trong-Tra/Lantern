"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { getApiBaseUrl } from "@lantern/config";
import { Skeleton } from "@/components/loading-skeleton";
import { fetchGqlAgents, toAgentRecord, type FetchLike } from "@/libs/app/graphql";
import {
  agentPins,
  agentVerifyUrl,
  rankAgents,
  shortAddress,
} from "@/libs/app/network";

const AgentMap = dynamic(
  () => import("./agent-map").then((module) => module.AgentMap),
  {
    loading: () => (
      <div role="status" aria-label="Loading agent map" className="app-map-canvas">
        <Skeleton className="loading-visual" />
      </div>
    ),
    ssr: false,
  },
);

const fetcher: FetchLike = (input, init) => fetch(input, init);

function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M10 2h4v4M7 9l7-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Live agent network board: GraphQL agents → standing rank (attestations)
 * + illustrative map pins. Shared header/nav is owned by the root layout.
 */
export function AppNetwork() {
  const baseUrl = getApiBaseUrl();
  const query = useQuery({
    queryKey: ["app", "agents", baseUrl],
    queryFn: ({ signal }) => fetchGqlAgents(baseUrl, fetcher, signal),
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: 1,
  });

  const ranked = useMemo(() => {
    const records = (query.data ?? []).map(toAgentRecord);
    return rankAgents(records);
  }, [query.data]);

  const pins = useMemo(() => agentPins(ranked.map((agent) => agent.id)), [ranked]);

  if (query.isPending) {
    return (
      <>
        <section className="app-map-section" aria-busy="true">
          <div className="app-map-head">
            <h2>Global host map</h2>
            <p>loading…</p>
          </div>
          <div className="app-map-canvas">
            <Skeleton className="loading-visual" />
          </div>
        </section>
        <section className="app-board-section" aria-busy="true" aria-label="Agent standing">
          <div className="app-board">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="app-card" key={index} aria-hidden="true">
                <Skeleton className="loading-label" />
                <Skeleton className="loading-value" />
                <Skeleton className="loading-line" />
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (query.isError) {
    return (
      <div className="app-state" role="status">
        <strong>Registry feed offline</strong>
        Could not reach the identity API at {baseUrl}. Start the market service
        (<code>go run ./cmd/market</code>) or check{" "}
        <code>NEXT_PUBLIC_API_URL</code>, then reload.
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <div className="app-state" role="status">
        <strong>No agents registered</strong>
        The ERC-8004 registry is empty. Seed agents on Fuji, then they will
        appear here with their soulbound track records.
      </div>
    );
  }

  return (
    <>
      <section className="app-map-section" aria-labelledby="app-map-title">
        <div className="app-map-head">
          <h2 id="app-map-title">Global host map</h2>
          <p>{pins.length} pin{pins.length === 1 ? "" : "s"} · illustrative</p>
        </div>
        <AgentMap pins={pins} />
      </section>

      <section className="app-board-section" aria-labelledby="app-board-title">
        <div className="app-board-head">
          <h2 id="app-board-title">Standing</h2>
          <p>ranked by earned attestations · never claimed</p>
        </div>
        <ul className="app-board">
          {ranked.map((agent) => {
            const verifyUrl = agentVerifyUrl(agent);
            return (
              <li key={agent.id} className="app-card">
                <div className="app-card-top">
                  <span className="app-rank" data-lead={agent.rank === 1 ? "true" : "false"}>
                    #{agent.rank}
                  </span>
                  <div className="app-standing">
                    <strong>{agent.attestationCount}</strong>
                    <span>attestations</span>
                  </div>
                </div>
                <p className="app-card-id">Agent {agent.id}</p>
                <p className="app-card-meta">
                  <b>Owner</b> {shortAddress(agent.owner)}
                  <br />
                  <b>Registered</b> {agent.registeredAt.slice(0, 10)}
                </p>
                {verifyUrl && (
                  <a
                    className="app-scan"
                    href={verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Verify agent ${agent.id} on 8004scan (opens in a new tab)`}
                  >
                    Verify on 8004scan
                    <ExternalIcon />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
