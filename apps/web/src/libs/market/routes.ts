// Quote route descriptions: turn an agent's `routes: [{bps, pools[]}]` into a
// readable split + hop chain for the exchange UI. A quote's bps split happens
// once, at the intent; each route then carries its full share through every
// pool on its path, so a hop's percentage is its route's percentage.
// Pure module (no framework imports) — unit-tested via tests/helpers/load-source.

import type { QuoteRoute } from "./quote-ws";
import { findToken, findTokenByAddress } from "./tokens";

/** One deployed Fuji DemoPool. */
export type DemoPool = { address: string; token0: string; token1: string };

/**
 * Fuji DemoPool topology — contracts/broadcast/DeployMarket.s.sol/43113/
 * run-latest.json (constructor args), docs/contracts.md. Quotes carry pool
 * addresses only, so this registry is what names each hop's pair. Update it
 * with the deploy artifacts when the topology changes.
 */
export const FUJI_DEMO_POOLS: readonly DemoPool[] = [
  { address: "0xfb9d4e5d3f4f8b089739b9d2f03e21d37f87e536", token0: "mUSDC", token1: "mUSDT" },
  { address: "0x49bf5bc89639b46cfe5b2efa716bb187f253a47e", token0: "mUSDC", token1: "mUSDT" },
  { address: "0x27e4967eb9e09efad6809914874159c771b51cac", token0: "mUSDC", token1: "mWAVAX" },
  { address: "0x2300ae9042adaf68c4c8b80fab6e19a9249d5ca0", token0: "mUSDC", token1: "mWAVAX" },
  { address: "0xc82b5a7fbc0535346c994dd8d6d47983690b7360", token0: "mUSDT", token1: "mWAVAX" },
  { address: "0x4b581d01aff9d688384f507208e56f70f71b1838", token0: "mWAVAX", token1: "mWETH" },
  { address: "0x8937e9037a7ad5d323236c7e11ae9db0d065d982", token0: "mWAVAX", token1: "mWETH" },
  { address: "0x3997d6a7b3b31ebdf39433a20a4d4efc86c68ca5", token0: "mWETH", token1: "mWBTC" },
  { address: "0x82dbcda614d0b3475c64e65088ca7b73228b09e0", token0: "mUSDC", token1: "mWETH" },
] as const;

const poolIndex = new Map(FUJI_DEMO_POOLS.map((pool) => [pool.address.toLowerCase(), pool]));

export function demoPool(address: string): DemoPool | undefined {
  return poolIndex.get(address.toLowerCase());
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

/** Token symbol for a contract address, else a short address (never a guess). */
export function tokenLabel(address: string): string {
  return findTokenByAddress(address)?.symbol ?? shortAddress(address);
}

function addressOfSymbol(symbol: string): string | null {
  return findToken(symbol)?.address ?? null;
}

export type RouteHop = {
  /** Pool contract address. */
  pool: string;
  /** "mUSDC / mWAVAX", or the short address when the pool is unknown. */
  pair: string;
  /** Token entering the pool (symbol or short address). */
  from: string;
  /** Token leaving the pool; "?" when the pool/pair can't be resolved. */
  to: string;
};

export type RouteLeg = {
  key: string;
  bps: number;
  /** Percentage of the input this leg carries, e.g. "62.5%". */
  percent: string;
  hops: RouteHop[];
};

/** 6250 bps → "62.5%"; 10_000 → "100%"; junk → "0%". */
export function formatBps(bps: number): string {
  if (!Number.isFinite(bps) || bps < 0) return "0%";
  const text = (bps / 100).toFixed(2).replace(/\.?0+$/, "");
  return `${text || "0"}%`;
}

/**
 * Describe one quote's routes, biggest allocation first (wire order breaks
 * ties). Hops follow the pool list in order; the token chain is walked from
 * `tokenIn` so a hop that doesn't connect shows "?" instead of a wrong symbol.
 */
export function describeRoutes(
  routes: readonly QuoteRoute[],
  tokenIn: string
): RouteLeg[] {
  return routes
    .map((route, index) => ({
      route,
      index,
      bps: Number.isFinite(route?.bps) ? route.bps : 0,
      pools: Array.isArray(route?.pools) ? route.pools : [],
    }))
    .sort((a, b) => b.bps - a.bps || a.index - b.index)
    .map(({ route, index, bps, pools }) => {
      let current: string = tokenIn;
      const hops: RouteHop[] = pools.map((poolAddress) => {
        const meta = demoPool(poolAddress);
        const from = tokenLabel(current);
        if (!meta) {
          return { pool: poolAddress, pair: shortAddress(poolAddress), from, to: "?" };
        }
        const pair = `${meta.token0} / ${meta.token1}`;
        const currentAddress = current.toLowerCase();
        const isToken0 =
          addressOfSymbol(meta.token0)?.toLowerCase() === currentAddress;
        const isToken1 =
          addressOfSymbol(meta.token1)?.toLowerCase() === currentAddress;
        if (!isToken0 && !isToken1) {
          // The stored pair doesn't touch the running token — don't invent a hop.
          return { pool: poolAddress, pair, from, to: "?" };
        }
        const nextAddress = addressOfSymbol(isToken0 ? meta.token1 : meta.token0);
        current = nextAddress ?? (isToken0 ? meta.token1 : meta.token0);
        return { pool: poolAddress, pair, from, to: tokenLabel(current) };
      });
      return {
        key: `${route?.bps ?? 0}:${pools.join(",") || index}`,
        bps,
        percent: formatBps(bps),
        hops,
      };
    });
}
