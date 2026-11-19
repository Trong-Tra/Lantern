// Typed fetchers for the market display feed (`GET /market/*`). Every
// function takes its base URL explicitly so the module stays pure and
// unit-testable (no config import, injectable fetch).

export type PriceEntry = { usd: number; ts?: string | null };
export type PricesResponse = {
  prices: Record<string, PriceEntry>;
  updatedAt: string | null;
};

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
export type CandlesResponse = {
  coin: string;
  interval: string;
  candles: Candle[];
  updatedAt: string | null;
};

export type GraphToken = {
  symbol: string;
  address: string;
  decimals: number;
  coin: string;
};
export type GraphPool = {
  chain: string;
  pair: string;
  address: string;
  token0: GraphToken;
  token1: GraphToken;
  reserve0: string;
  reserve1: string;
  updatedAt: string;
};
export type GraphResponse = { pools: GraphPool[]; updatedAt: string | null };

export type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

async function getJson<T>(url: string, fetcher: FetchLike, signal?: AbortSignal): Promise<T> {
  const res = await fetcher(url, signal ? { signal } : undefined);
  if (!res.ok) throw new Error(`market feed ${url} → ${res.status}`);
  return (await res.json()) as T;
}

export function fetchPrices(baseUrl: string, fetcher: FetchLike, signal?: AbortSignal): Promise<PricesResponse> {
  return getJson<PricesResponse>(`${baseUrl}/market/prices`, fetcher, signal);
}

export function fetchCandles(
  baseUrl: string,
  fetcher: FetchLike,
  params: { coin: string; interval: string; limit: number },
  signal?: AbortSignal
): Promise<CandlesResponse> {
  const query = new URLSearchParams({
    coin: params.coin,
    interval: params.interval,
    limit: String(params.limit),
  });
  return getJson<CandlesResponse>(`${baseUrl}/market/candles?${query}`, fetcher, signal);
}

export function fetchGraph(baseUrl: string, fetcher: FetchLike, signal?: AbortSignal): Promise<GraphResponse> {
  return getJson<GraphResponse>(`${baseUrl}/market/graph`, fetcher, signal);
}
