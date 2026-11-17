"use client";

import { describeRoutes, shortAddress, tokenLabel } from "@/libs/market/routes";
import type { QuoteBody } from "@/libs/market/quote-ws";

/**
 * Click-open view of a solver quote's route: the split per path, then every
 * hop in order with the pool, its pair and the share of the input that flows
 * through it (a route keeps its full share across all of its hops).
 */
export function QuoteRouteFlow({ quote }: { quote: QuoteBody }) {
  const legs = describeRoutes(quote.routes ?? [], quote.tokenIn);
  if (legs.length === 0)
    return <p className="exchange-route-empty">This quote carries no route.</p>;
  return (
    <div className="exchange-route-flow">
      <p className="exchange-route-head">
        <span>{tokenLabel(quote.tokenIn)}</span> in · split{" "}
        {legs.length === 1 ? "as one route" : `across ${legs.length} routes`}
      </p>
      <ol>
        {legs.map((leg) => (
          <li key={leg.key}>
            <span className="exchange-route-share">{leg.percent}</span>
            <div className="exchange-route-hops">
              {leg.hops.length === 0 && (
                <span className="exchange-route-token">direct</span>
              )}
              {leg.hops.map((hop, index) => (
                <span className="exchange-route-hop" key={`${hop.pool}-${index}`}>
                  <span
                    className="exchange-route-pool"
                    title={`${hop.pool} — ${hop.from} → ${hop.to}`}
                  >
                    <b>{hop.pair}</b>
                    <code>{shortAddress(hop.pool)}</code>
                    <small>{leg.percent} of input</small>
                  </span>
                  <span className="exchange-route-arrow" aria-hidden="true">
                    →
                  </span>
                  <span
                    className="exchange-route-token"
                    data-unknown={hop.to === "?"}
                    title={hop.to === "?" ? `Unknown pair in pool ${hop.pool}` : hop.to}
                  >
                    {hop.to}
                  </span>
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
