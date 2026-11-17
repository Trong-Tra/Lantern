"use client";

import { useQuery } from "@tanstack/react-query";
import { getMarketApiBaseUrl } from "@lantern/config";
import {
  fetchCandles,
  fetchGraph,
  fetchPrices,
  type CandlesResponse,
  type FetchLike,
  type GraphResponse,
  type PricesResponse,
} from "@/libs/market/api";

// The market service serves the display feed on one origin; responses are
// no-store server-side, so short client stale times just coalesce renders.
const baseUrl = getMarketApiBaseUrl();
const fetcher: FetchLike = (input, init) => fetch(input, init);

export function useMarketPrices() {
  return useQuery<PricesResponse>({
    queryKey: ["market", "prices", baseUrl],
    queryFn: ({ signal }) => fetchPrices(baseUrl, fetcher, signal),
    refetchInterval: 2000,
    staleTime: 1000,
  });
}

/** OHLCV history for one Hyperliquid coin. `coin === null` disables the query. */
export function useMarketCandles(coin: string | null, interval: string, limit: number, refetchMs = 5000) {
  return useQuery<CandlesResponse>({
    queryKey: ["market", "candles", coin, interval, limit, baseUrl],
    queryFn: ({ signal }) => {
      if (!coin) throw new Error("useMarketCandles: coin required");
      return fetchCandles(baseUrl, fetcher, { coin, interval, limit }, signal);
    },
    enabled: Boolean(coin),
    refetchInterval: refetchMs,
    staleTime: Math.min(2000, refetchMs),
  });
}

/** Real-DEX pool graph (reserves poll). */
export function useMarketGraph() {
  return useQuery<GraphResponse>({
    queryKey: ["market", "graph", baseUrl],
    queryFn: ({ signal }) => fetchGraph(baseUrl, fetcher, signal),
    refetchInterval: 5000,
    staleTime: 2000,
  });
}
