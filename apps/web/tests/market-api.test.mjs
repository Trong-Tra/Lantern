import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { fetchPrices, fetchCandles, fetchGraph } = loadSource("src/libs/market/api.ts");

function fakeFetch(payload, capture = {}) {
  return async (url, init) => {
    capture.url = url;
    capture.init = init;
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    };
  };
}

test("fetchPrices hits /market/prices and passes the payload through", async () => {
  const payload = {
    prices: { ETH: { usd: 3000.25, ts: "2026-11-17T00:00:00Z" } },
    updatedAt: "2026-11-17T00:00:00Z",
  };
  const capture = {};
  const result = await fetchPrices("http://localhost:8082", fakeFetch(payload, capture));
  assert.equal(capture.url, "http://localhost:8082/market/prices");
  assert.deepEqual(result, payload);
});

test("fetchCandles encodes coin, interval and limit as query params", async () => {
  const payload = { coin: "ETH", interval: "1h", candles: [], updatedAt: null };
  const capture = {};
  const result = await fetchCandles(
    "http://feed",
    fakeFetch(payload, capture),
    { coin: "ETH", interval: "1h", limit: 168 }
  );
  const url = new URL(capture.url);
  assert.equal(url.pathname, "/market/candles");
  assert.equal(url.searchParams.get("coin"), "ETH");
  assert.equal(url.searchParams.get("interval"), "1h");
  assert.equal(url.searchParams.get("limit"), "168");
  assert.deepEqual(result, payload);
});

test("fetchGraph passes the pool list through", async () => {
  const payload = {
    pools: [
      {
        chain: "ethereum",
        pair: "WBTC/WETH",
        address: "0xabc",
        token0: { symbol: "WBTC", address: "0x1", decimals: 18, coin: "BTC" },
        token1: { symbol: "WETH", address: "0x2", decimals: 18, coin: "ETH" },
        reserve0: "100",
        reserve1: "200",
        updatedAt: "2026-11-17T00:00:00Z",
      },
    ],
    updatedAt: "2026-11-17T00:00:00Z",
  };
  const capture = {};
  const result = await fetchGraph("http://feed", fakeFetch(payload, capture));
  assert.equal(capture.url, "http://feed/market/graph");
  assert.equal(result.pools[0].pair, "WBTC/WETH");
});

test("non-2xx responses reject with the status — callers surface an error state", async () => {
  const failing = async () => ({ ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(() => fetchPrices("http://feed", failing), /503/);
  await assert.rejects(() => fetchGraph("http://feed", failing), /503/);
});

test("abort signals reach the fetch call", async () => {
  const capture = {};
  const controller = new AbortController();
  await fetchPrices("http://feed", fakeFetch({ prices: {}, updatedAt: null }, capture), controller.signal);
  assert.equal(capture.init.signal, controller.signal);
});
