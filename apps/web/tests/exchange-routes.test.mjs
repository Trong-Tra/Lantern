import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { describeRoutes, formatBps, demoPool, tokenLabel, shortAddress, FUJI_DEMO_POOLS } =
  loadSource("src/libs/market/routes.ts");

const USDC = "0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8";
const USDT = "0x173C86c27Ea43BB541b84E72076B8CA7Ff5b1e41";
const WAVAX = "0x6Eb204b09A36547fE21833744c8C9cC802C19B04";
const WETH = "0x1e38cf69DA98506F14D43C82a3ca8Aa825ac8aF7";
const UNKNOWN_POOL = "0x1111111111111111111111111111111111111111";

test("formatBps renders split percentages without trailing noise", () => {
  assert.equal(formatBps(10_000), "100%");
  assert.equal(formatBps(6250), "62.5%");
  assert.equal(formatBps(3333), "33.33%");
  assert.equal(formatBps(0), "0%");
  assert.equal(formatBps(Number.NaN), "0%");
});

test("pool registry resolves the deployed Fuji pools", () => {
  assert.equal(FUJI_DEMO_POOLS.length, 9);
  assert.deepEqual(demoPool("0xFB9D4e5d3F4f8b089739B9D2f03e21d37f87e536"), {
    address: "0xfb9d4e5d3f4f8b089739b9d2f03e21d37f87e536",
    token0: "mUSDC",
    token1: "mUSDT",
  });
  assert.equal(demoPool(UNKNOWN_POOL), undefined);
  assert.equal(tokenLabel(USDC), "mUSDC");
  assert.equal(tokenLabel(UNKNOWN_POOL), "0x1111…1111");
  assert.equal(shortAddress("0x1111111111111111111111111111111111111111"), "0x1111…1111");
});

test("multi-hop leg walks the token chain and keeps its share on every hop", () => {
  // mUSDC → mUSDT (0xfb9d) → mWAVAX (0xc82b): a two-hop path, 100% of input.
  const [leg] = describeRoutes(
    [{ bps: 10_000, pools: ["0xfb9d4e5d3f4f8b089739b9d2f03e21d37f87e536", "0xc82b5a7fbc0535346c994dd8d6d47983690b7360"] }],
    USDC
  );
  assert.equal(leg.percent, "100%");
  assert.equal(leg.hops.length, 2);
  assert.deepEqual(
    leg.hops.map((hop) => [hop.pair, hop.from, hop.to]),
    [
      ["mUSDC / mUSDT", "mUSDC", "mUSDT"],
      ["mUSDT / mWAVAX", "mUSDT", "mWAVAX"],
    ]
  );
});

test("routes are ordered by allocation, ties keep wire order", () => {
  const legs = describeRoutes(
    [
      { bps: 3000, pools: ["0x27e4967eb9e09efad6809914874159c771b51cac"] },
      { bps: 5000, pools: ["0x2300ae9042adaf68c4c8b80fab6e19a9249d5ca0"] },
      { bps: 2000, pools: ["0x82dbcda614d0b3475c64e65088ca7b73228b09e0"] },
      { bps: 5000, pools: ["0xfb9d4e5d3f4f8b089739b9d2f03e21d37f87e536"] },
    ],
    USDC
  );
  assert.deepEqual(
    legs.map((leg) => leg.percent),
    ["50%", "50%", "30%", "20%"]
  );
  assert.equal(legs[0].hops[0].pool, "0x2300ae9042adaf68c4c8b80fab6e19a9249d5ca0");
});

test("hops stay honest for unknown pools and disconnected pairs", () => {
  const [unknown] = describeRoutes([{ bps: 10_000, pools: [UNKNOWN_POOL] }], USDC);
  assert.equal(unknown.hops[0].pair, "0x1111…1111");
  assert.equal(unknown.hops[0].from, "mUSDC");
  assert.equal(unknown.hops[0].to, "?");

  // mWETH/mWBTC doesn't touch mUSDC — no fabricated intermediate token.
  const [wrongPair] = describeRoutes(
    [{ bps: 10_000, pools: ["0x3997d6a7b3b31ebdf39433a20a4d4efc86c68ca5"] }],
    USDC
  );
  assert.equal(wrongPair.hops[0].pair, "mWETH / mWBTC");
  assert.equal(wrongPair.hops[0].to, "?");
});

test("three-hop path resolves every intermediate token", () => {
  const [leg] = describeRoutes(
    [
      {
        bps: 10_000,
        pools: [
          "0x2300ae9042adaf68c4c8b80fab6e19a9249d5ca0", // mUSDC/mWAVAX
          "0x4b581d01aff9d688384f507208e56f70f71b1838", // mWAVAX/mWETH
          "0x3997d6a7b3b31ebdf39433a20a4d4efc86c68ca5", // mWETH/mWBTC
        ],
      },
    ],
    USDC
  );
  assert.deepEqual(
    leg.hops.map((hop) => hop.to),
    ["mWAVAX", "mWETH", "mWBTC"]
  );
  assert.equal(leg.hops[2].from, "mWETH");
});
