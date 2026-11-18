"use client";

import type { CSSProperties } from "react";
import { layoutQuoteRoutes } from "@/libs/market/route-layout";
import { tokenLabel } from "@/libs/market/routes";
import type { QuoteBody } from "@/libs/market/quote-ws";

/**
 * Click-open view of a solver quote's route: a transit-line diagram. Each
 * split leg is a horizontal wire that draws itself left to right — token
 * stops sit on the vertices, pool nodes ride the segments with their pair
 * and address, and multi-route quotes branch off a shared spine.
 */
export function QuoteRouteFlow({ quote }: { quote: QuoteBody }) {
  const diagram = layoutQuoteRoutes(quote.routes ?? [], quote.tokenIn);
  if (!diagram)
    return <p className="exchange-route-empty">This quote carries no route.</p>;
  return (
    <div className="exchange-route-flow">
      <p className="exchange-route-head">
        <span>{tokenLabel(quote.tokenIn)}</span> in · split{" "}
        {diagram.legCount === 1 ? "as one route" : `across ${diagram.legCount} routes`}
      </p>
      <div className="exchange-route-canvas">
        <svg
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          style={{ minWidth: diagram.width }}
          role="img"
          aria-label={`Route split — ${diagram.summary}`}
        >
          {diagram.spine && (
            <line
              className="exchange-route-spine"
              x1={diagram.spine.x}
              y1={diagram.spine.y1}
              x2={diagram.spine.x}
              y2={diagram.spine.y2}
              pathLength={1}
            />
          )}
          {diagram.wires.map((wire) => (
            <line
              key={wire.id}
              className="exchange-route-wire"
              x1={wire.x1}
              y1={wire.y1}
              x2={wire.x2}
              y2={wire.y2}
              pathLength={1}
              style={{ animationDelay: `${wire.delay}ms` }}
            />
          ))}
          {diagram.shares.map((share) => (
            <text
              key={share.id}
              className="exchange-route-share"
              x={share.x}
              y={share.y}
              style={{ "--route-delay": `${share.delay}ms` } as CSSProperties}
            >
              {share.text}
            </text>
          ))}
          {diagram.nodes.map((node) => (
            <g
              key={node.id}
              className="exchange-route-node"
              data-kind={node.kind}
              data-tone={node.tone}
              style={{ "--route-delay": `${node.delay}ms` } as CSSProperties}
            >
              <circle cx={node.x} cy={node.y} r={node.kind === "pool" ? 4 : 3.5} />
              <text
                className="exchange-route-node-label"
                x={node.x}
                y={node.kind === "pool" ? node.y - 14 : node.y + 18}
                textAnchor="middle"
              >
                {node.label}
              </text>
              {node.sub && (
                <text
                  className="exchange-route-node-sub"
                  x={node.x}
                  y={node.kind === "pool" ? node.y - 25 : node.y + 30}
                  textAnchor="middle"
                >
                  {node.sub}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
