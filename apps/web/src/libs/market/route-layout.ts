// Transit-line geometry for a quote's route diagram: described route legs
// become SVG coordinates (split spine, per-hop wires, token vertices, pool
// nodes) plus staggered draw delays so the route draws itself left to right.
// Pure module (no framework imports) — unit-tested via tests/helpers/load-source.

import { describeRoutes, shortAddress, tokenLabel } from "./routes";
import type { QuoteBody } from "./quote-ws";

export const ROUTE_LAYOUT = {
  /** Share % label left anchor. */
  shareX: 4,
  /** Vertical split spine x (multi-leg quotes only). */
  spineX: 46,
  /** First token vertex x. */
  firstX: 62,
  /** Pixels per hop. */
  segment: 132,
  /** Vertical pitch between legs. */
  legHeight: 64,
  /** First wire y (leaves room for pool labels above). */
  top: 34,
  /** Room after the last vertex for its centered label. */
  endPad: 56,
  bottomPad: 34,
} as const;

export type RouteWire = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Draw-in delay, ms — the wire grows hop by hop. */
  delay: number;
};

export type RouteNode = {
  id: string;
  x: number;
  y: number;
  /** vertex = token stop on the wire; pool = node sitting on a segment. */
  kind: "vertex" | "pool";
  /** Token symbol (vertex) or "mUSDC / mWAVAX" (pool). */
  label: string;
  /** Short pool address (pool nodes only). */
  sub?: string;
  tone: "in" | "mid" | "out" | "unknown" | "pool";
  delay: number;
};

export type RouteShare = {
  id: string;
  x: number;
  y: number;
  text: string;
  delay: number;
};

export type RouteDiagram = {
  width: number;
  height: number;
  /** Split spine joining every leg's stem; null for a single route. */
  spine: { x: number; y1: number; y2: number } | null;
  wires: RouteWire[];
  nodes: RouteNode[];
  shares: RouteShare[];
  legCount: number;
  /** One-line accessible summary, e.g. "62%: mUSDC → mWAVAX; 38%: …". */
  summary: string;
};

/**
 * Lay out one quote's routes, biggest allocation first (describeRoutes
 * order). Wires/nodes carry increasing delays so a leg draws stem → hops.
 */
export function layoutQuoteRoutes(
  routes: QuoteBody["routes"],
  tokenIn: string
): RouteDiagram | null {
  const legs = describeRoutes(routes ?? [], tokenIn);
  if (legs.length === 0) return null;

  const L = ROUTE_LAYOUT;
  const multi = legs.length > 1;
  const maxHops = Math.max(1, ...legs.map((leg) => leg.hops.length));
  const width = L.firstX + maxHops * L.segment + L.endPad;
  const lineY = (index: number) => L.top + index * L.legHeight;
  const height = lineY(legs.length - 1) + L.bottomPad;

  const wires: RouteWire[] = [];
  const nodes: RouteNode[] = [];
  const shares: RouteShare[] = [];
  const summaryParts: string[] = [];

  legs.forEach((leg, index) => {
    const y = lineY(index);
    const base = 90 + index * 120;
    shares.push({
      id: `share-${leg.key}`,
      x: L.shareX,
      y: y + 4,
      text: leg.percent,
      delay: base,
    });

    if (multi) {
      wires.push({
        id: `stem-${leg.key}`,
        x1: L.spineX,
        y1: y,
        x2: L.firstX,
        y2: y,
        delay: base,
      });
    }

    if (leg.hops.length === 0) {
      nodes.push({
        id: `v-${leg.key}-0`,
        x: L.firstX,
        y,
        kind: "vertex",
        label: tokenLabel(tokenIn),
        sub: "direct",
        tone: "in",
        delay: base + 60,
      });
      summaryParts.push(`${leg.percent}: direct`);
      return;
    }

    leg.hops.forEach((hop, hopIndex) => {
      const x1 = L.firstX + hopIndex * L.segment;
      const x2 = x1 + L.segment;
      const last = hopIndex === leg.hops.length - 1;
      wires.push({
        id: `w-${leg.key}-${hopIndex}`,
        x1,
        y1: y,
        x2,
        y2: y,
        delay: base + 60 + hopIndex * 130,
      });
      if (hopIndex === 0) {
        nodes.push({
          id: `v-${leg.key}-0`,
          x: x1,
          y,
          kind: "vertex",
          label: hop.from,
          tone: "in",
          delay: base + 40,
        });
      }
      nodes.push({
        id: `p-${leg.key}-${hopIndex}`,
        x: (x1 + x2) / 2,
        y,
        kind: "pool",
        label: hop.pair,
        sub: shortAddress(hop.pool),
        tone: "pool",
        delay: base + 120 + hopIndex * 130,
      });
      nodes.push({
        id: `v-${leg.key}-${hopIndex + 1}`,
        x: x2,
        y,
        kind: "vertex",
        label: hop.to,
        tone: hop.to === "?" ? "unknown" : last ? "out" : "mid",
        delay: base + 160 + hopIndex * 130,
      });
    });

    summaryParts.push(
      `${leg.percent}: ${[leg.hops[0].from, ...leg.hops.map((hop) => hop.to)].join(" → ")}`
    );
  });

  return {
    width,
    height,
    spine: multi ? { x: L.spineX, y1: lineY(0), y2: lineY(legs.length - 1) } : null,
    wires,
    nodes,
    shares,
    legCount: legs.length,
    summary: summaryParts.join("; "),
  };
}
