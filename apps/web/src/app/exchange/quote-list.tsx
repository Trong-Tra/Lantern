"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { formatUnits } from "@/libs/market/tokens";
import type { SignedQuote } from "@/libs/market/quote-ws";
import { QuoteRouteFlow } from "./quote-routes";

/** How long a retracted quote lingers while it withdraws. */
const LEAVE_MS = 220;

/** Base-unit decimal string → display; malformed server data shows 0, never crashes. */
function safeUnits(value: string, decimals: number): string {
  try {
    return formatUnits(BigInt(value), decimals);
  } catch {
    return "0";
  }
}

/** Trim a formatted amount for the row: 6 decimals max, no trailing zeros. */
function trimAmount(value: string): string {
  if (!value.includes(".")) return value;
  const [whole, frac] = value.split(".");
  const trimmed = frac.slice(0, 6).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/** Output as a share of the best offer (0–100+), for the comparison meter. */
function percentOfBest(out: string, bestOut: string): number {
  const amount = Number(out);
  const best = Number(bestOut);
  if (!Number.isFinite(amount) || !Number.isFinite(best) || best <= 0) return 0;
  return Math.min(100, (amount / best) * 100);
}

function deltaLabel(out: string, bestOut: string): string | null {
  const amount = Number(out);
  const best = Number(bestOut);
  if (!Number.isFinite(amount) || !Number.isFinite(best) || best <= 0) return null;
  const delta = (amount / best - 1) * 100;
  if (delta >= -0.004) return null;
  return `−${Math.abs(delta).toFixed(2)}%`;
}

type QuoteStreamListProps = {
  /** Visible quotes, already sorted best-first and slippage-filtered. */
  quotes: SignedQuote[];
  buySymbol: string;
  buyDecimals: number;
  openRouteId: string | null;
  onToggleRoute: (quoteId: string) => void;
  onPick: (quoteId: string) => void;
};

/**
 * The streaming solver-quote ticker. Quotes rise in as they arrive over the
 * socket, the leader carries the gold Best tag and a full meter, and a
 * retracted quote withdraws instead of vanishing mid-list.
 */
export function QuoteStreamList({
  quotes,
  buySymbol,
  buyDecimals,
  openRouteId,
  onToggleRoute,
  onPick,
}: QuoteStreamListProps) {
  const [leaving, setLeaving] = useState<SignedQuote[]>([]);
  const previousRef = useRef<Map<string, SignedQuote>>(new Map());

  useEffect(() => {
    const previous = previousRef.current;
    const current = new Map(quotes.map((entry) => [entry.quoteId, entry]));
    previousRef.current = current;
    const departed = [...previous.values()].filter(
      (entry) => !current.has(entry.quoteId)
    );
    if (departed.length === 0) return;
    setLeaving((rows) => [
      ...rows.filter((row) => !departed.some((gone) => gone.quoteId === row.quoteId)),
      ...departed,
    ]);
    const ids = departed.map((entry) => entry.quoteId);
    const timer = setTimeout(() => {
      setLeaving((rows) => rows.filter((row) => !ids.includes(row.quoteId)));
    }, LEAVE_MS);
    return () => clearTimeout(timer);
  }, [quotes]);

  const best = quotes[0] ?? null;
  const bestOut = best ? safeUnits(best.quote.quotedOut, buyDecimals) : "0";
  const liveIds = new Set(quotes.map((entry) => entry.quoteId));
  const rows: { entry: SignedQuote; withdrawing: boolean }[] = [
    ...quotes.map((entry) => ({ entry, withdrawing: false })),
    ...leaving
      .filter((entry) => !liveIds.has(entry.quoteId))
      .map((entry) => ({ entry, withdrawing: true })),
  ];

  return (
    <div className="exchange-quote-list" aria-label="Solver quotes">
      <p>
        <i className="exchange-quote-live" aria-hidden="true" />
        Solver quotes · signed, streaming in
      </p>
      <ul>
        {rows.map(({ entry, withdrawing }) => {
          const id = entry.quoteId;
          const open = !withdrawing && openRouteId === id;
          const routeId = `quote-route-${id}`;
          const out = trimAmount(safeUnits(entry.quote.quotedOut, buyDecimals));
          const minOut = trimAmount(safeUnits(entry.quote.minOut, buyDecimals));
          const isBest = !withdrawing && best?.quoteId === id;
          const delta = isBest ? null : deltaLabel(out, bestOut);
          return (
            <li
              className="exchange-quote"
              key={id}
              data-best={isBest || undefined}
              data-leaving={withdrawing || undefined}
              aria-hidden={withdrawing || undefined}
            >
              <div className="exchange-quote-line">
                <button
                  type="button"
                  className="exchange-quote-toggle"
                  aria-expanded={open}
                  aria-controls={routeId}
                  disabled={withdrawing}
                  onClick={() => onToggleRoute(id)}
                >
                  <span className="exchange-quote-agent" title={`Agent ${entry.quote.agentId}`}>
                    <i className="exchange-quote-dot" aria-hidden="true" />
                    Agent {entry.quote.agentId}
                  </span>
                  <span className="exchange-quote-values">
                    <b>
                      {out} {buySymbol}
                    </b>
                    <small>
                      {isBest ? <em className="exchange-quote-best">Best · </em> : null}
                      {delta ? `${delta} · ` : ""}min {minOut}
                    </small>
                  </span>
                  <ChevronDownIcon
                    className="exchange-quote-chevron"
                    data-open={open}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="exchange-quote-select"
                  disabled={withdrawing}
                  onClick={() => onPick(id)}
                >
                  Select
                </button>
              </div>
              <div className="exchange-quote-meter" aria-hidden="true">
                <i style={{ width: `${percentOfBest(out, bestOut)}%` }} />
              </div>
              {open && (
                <div className="exchange-quote-route" id={routeId}>
                  <QuoteRouteFlow quote={entry.quote} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
