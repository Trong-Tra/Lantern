import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { layoutQuoteRoutes, ROUTE_LAYOUT } = loadSource("src/libs/market/route-layout.ts");

const USDC = "0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8";
const POOL_USDC_WAVAX = "0x2300ae9042adaf68c4c8b80fab6e19a9249d5ca0";
const POOL_USDC_USDT = "0xfb9d4e5d3f4f8b089739b9d2f03e21d37f87e536";
const POOL_USDT_WAVAX = "0xc82b5a7fbc0535346c994dd8d6d47983690b7360";

test("empty routes produce no diagram", () => {
  assert.equal(layoutQuoteRoutes([], USDC), null);
  assert.equal(layoutQuoteRoutes(undefined, USDC), null);
});

test("single-hop leg: one wire, in/out vertices, pool node between them", () => {
  const diagram = layoutQuoteRoutes([{ bps: 10_000, pools: [POOL_USDC_WAVAX] }], USDC);
  assert.equal(diagram.legCount, 1);
  assert.equal(diagram.spine, null);
  assert.equal(diagram.wires.length, 1);

  const vertices = diagram.nodes.filter((node) => node.kind === "vertex");
  const pools = diagram.nodes.filter((node) => node.kind === "pool");
  assert.deepEqual(
    vertices.map((node) => [node.label, node.tone]),
    [
      ["mUSDC", "in"],
      ["mWAVAX", "out"],
    ]
  );
  assert.equal(pools.length, 1);
  assert.equal(pools[0].label, "mUSDC / mWAVAX");
  assert.equal(pools[0].sub, "0x2300…5ca0");

  // Pool node sits at the segment midpoint; vertices bound the wire.
  const [wire] = diagram.wires;
  assert.equal(pools[0].x, (wire.x1 + wire.x2) / 2);
  assert.equal(vertices[0].x, wire.x1);
  assert.equal(vertices[1].x, wire.x2);
  assert.equal(diagram.summary, "100%: mUSDC → mWAVAX");
});

test("split quote branches off a shared spine with staggered leg delays", () => {
  const diagram = layoutQuoteRoutes(
    [
      { bps: 6250, pools: [POOL_USDC_WAVAX] },
      { bps: 3750, pools: [POOL_USDC_USDT, POOL_USDT_WAVAX] },
    ],
    USDC
  );
  assert.equal(diagram.legCount, 2);
  assert.ok(diagram.spine);
  assert.equal(diagram.spine.x, ROUTE_LAYOUT.spineX);
  assert.equal(diagram.spine.y1, ROUTE_LAYOUT.top);
  assert.equal(diagram.spine.y2, ROUTE_LAYOUT.top + ROUTE_LAYOUT.legHeight);

  // One stem per leg, starting at the spine.
  const stems = diagram.wires.filter((wire) => wire.x1 === ROUTE_LAYOUT.spineX);
  assert.equal(stems.length, 2);

  // Share labels match allocation order and sit on their leg's wire height.
  assert.deepEqual(
    diagram.shares.map((share) => share.text),
    ["62.5%", "37.5%"]
  );
  assert.equal(diagram.shares[0].y, ROUTE_LAYOUT.top + 4);
  assert.equal(diagram.shares[1].y, ROUTE_LAYOUT.top + ROUTE_LAYOUT.legHeight + 4);

  // Delays grow along the draw order: spine stems, then hops left to right.
  const delays = diagram.wires.map((wire) => wire.delay);
  assert.deepEqual(delays, [...delays].sort((a, b) => a - b));
  assert.equal(diagram.summary, "62.5%: mUSDC → mWAVAX; 37.5%: mUSDC → mUSDT → mWAVAX");
});

test("unknown pools and disconnected pairs stay honest in geometry", () => {
  const diagram = layoutQuoteRoutes(
    [{ bps: 10_000, pools: ["0x1111111111111111111111111111111111111111"] }],
    USDC
  );
  const out = diagram.nodes.find((node) => node.kind === "vertex" && node.tone === "unknown");
  assert.equal(out.label, "?");
  const pool = diagram.nodes.find((node) => node.kind === "pool");
  assert.equal(pool.label, "0x1111…1111");
});

test("sizing fits the hop count and longest leg", () => {
  const one = layoutQuoteRoutes([{ bps: 10_000, pools: [POOL_USDC_WAVAX] }], USDC);
  const two = layoutQuoteRoutes(
    [{ bps: 10_000, pools: [POOL_USDC_USDT, POOL_USDT_WAVAX] }],
    USDC
  );
  assert.equal(one.width, ROUTE_LAYOUT.firstX + ROUTE_LAYOUT.segment + ROUTE_LAYOUT.endPad);
  assert.equal(two.width, ROUTE_LAYOUT.firstX + 2 * ROUTE_LAYOUT.segment + ROUTE_LAYOUT.endPad);
  assert.ok(two.height > one.height || two.legCount === one.legCount);
});
