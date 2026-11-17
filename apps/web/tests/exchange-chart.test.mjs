import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { chartPeriods, chartLimitFor, chartIntervalFor, chartRefetchFor, buildChartSeries, interpolateCandles } =
  loadSource("src/app/exchange/chart-data.ts");

// Hour-aligned synthetic OHLCV (unix ms open times, newest last).
function syntheticCandles(count, startPrice = 100) {
  const now = 1_700_000_000_000;
  let price = startPrice;
  return Array.from({ length: count }, (_, i) => {
    const drift = Math.sin(i / 3) * 2 + (i > count / 2 ? -1.5 : 0.7);
    const open = price;
    const close = Math.max(0.01, price + drift);
    const high = Math.max(open, close) + 0.4;
    const low = Math.min(open, close) - 0.4;
    price = close;
    return {
      t: now - (count - i) * 3_600_000,
      o: open,
      h: high,
      l: low,
      c: close,
      v: 10 + (i % 5) * 3,
    };
  });
}

test("each period is its own native candle size plus the forming candle", () => {
  assert.deepEqual(chartPeriods, ["5m", "1H", "1D", "1W", "1M"]);
  // Same wording as the button: 5m = 5-minute candles; 72 closed + the live one.
  assert.equal(chartIntervalFor("5m"), "5m");
  assert.equal(chartIntervalFor("1H"), "1h");
  assert.equal(chartIntervalFor("1D"), "1d");
  assert.equal(chartIntervalFor("1W"), "1w");
  assert.equal(chartIntervalFor("1M"), "1M");
  assert.equal(chartLimitFor("5m"), 73);
  assert.equal(chartLimitFor("1H"), 73);
  assert.equal(chartLimitFor("1D"), 73);
  assert.equal(chartLimitFor("1W"), 25);
  assert.equal(chartLimitFor("1M"), 13);
  // The extra bar over the closed count is the one that moves between polls.
  for (const period of chartPeriods) assert.ok(chartLimitFor(period) > 1);
  assert.equal(chartIntervalFor("bogus"), "1h");
  assert.equal(chartLimitFor("bogus"), 73);
  // Fast views poll faster so the moving last candle streams.
  assert.ok(chartRefetchFor("5m") < chartRefetchFor("1H"));
  assert.ok(chartRefetchFor("1H") < chartRefetchFor("1M"));
});

test("interpolateCandles glides same-open-time candles, pops rolled ones", () => {
  const from = syntheticCandles(4, 100);
  // Same window, last candle moved — glides element-wise.
  const tick = from.map((c, i) => (i === from.length - 1 ? { ...c, c: c.c + 10, h: c.h + 12 } : c));
  const half = interpolateCandles(from, tick, 0.5);
  assert.equal(half.length, tick.length);
  assert.equal(half.at(-1).c, from.at(-1).c + 5);
  assert.equal(half.at(-1).h, from.at(-1).h + 6);
  assert.equal(half[0].c, from[0].c);
  // t >= 1 lands exactly on the target.
  assert.deepEqual(interpolateCandles(from, tick, 1), tick);
  // Window rolled one candle — shifted entries have no same-t partner and pop
  // at their real values (no fabricated in-between shapes).
  const rolled = [...from.slice(1), { t: from.at(-1).t + 3_600_000, o: 1, h: 2, l: 0.5, c: 1.5, v: 3 }];
  const glided = interpolateCandles(from, rolled, 0.5);
  assert.equal(glided.length, rolled.length);
  assert.equal(glided.at(-1).c, 1.5);
  // Empty source goes straight to target.
  assert.deepEqual(interpolateCandles([], tick, 0.5), tick);
});

test("series geometry comes from real candles — endpoints, axis, path", () => {
  for (const period of chartPeriods) {
    const candles = syntheticCandles(72);
    const chart = buildChartSeries(candles, period, candles[candles.length - 1].t);
    assert.ok(chart, `series for ${period}`);
    assert.equal(chart.points.length, candles.length);
    assert.equal(chart.values.length, candles.length);
    assert.equal(chart.volumes.length, candles.length);
    assert.ok(chart.volumes.every((v) => v >= 0));
    // Endpoints and change agree with the candle series.
    assert.equal(chart.close, candles[candles.length - 1].c);
    assert.equal(chart.open, candles[0].o);
    assert.ok(
      Math.abs((chart.close / chart.open - 1) * 100 - chart.change) < 1e-9
    );
    assert.ok(chart.low <= Math.min(...candles.map((c) => c.l)));
    assert.ok(chart.high >= Math.max(...candles.map((c) => c.h)));
    // Geometry stays inside the SVG box.
    for (const point of chart.points)
      assert.ok(
        Number.isFinite(point.y) && point.y >= 20 && point.y <= 230 && point.value > 0
      );
    assert.ok(chart.path.startsWith("M"));
    assert.equal(chart.path.split("L").length, candles.length);
    // One display candle per feed candle — no rebucketing.
    assert.equal(chart.candles.length, candles.length);
    // Band centers: the first/last bodies clear the plot edges (20..620)
    // instead of being clipped in half.
    const slot = 600 / candles.length;
    assert.ok(Math.abs(chart.candles[0].x - (20 + slot / 2)) < 1e-9);
    assert.ok(Math.abs(chart.candles.at(-1).x - (620 - slot / 2)) < 1e-9);
    assert.ok(chart.points.every((point) => point.x > 20 && point.x < 620));
    for (const candle of chart.candles) {
      assert.ok(candle.high >= Math.max(candle.open, candle.close));
      assert.ok(candle.low <= Math.min(candle.open, candle.close));
    }
    assert.equal(chart.timeLabels.length, 5);
    assert.match(chart.duration, /\d+ (hour|day)s?/);
    assert.equal(chart.baseline, chart.y(chart.open));
  }
});

test("null series for empty, short, or junk input — no fabricated line", () => {
  assert.equal(buildChartSeries([], "1D"), null);
  assert.equal(buildChartSeries([{ t: 1, o: 1, h: 1, l: 1, c: 1, v: 1 }], "1D"), null);
  assert.equal(
    buildChartSeries([{ t: NaN, o: 1, h: 1, l: 1, c: 1, v: 1 }, { t: 2, o: 1, h: 1, l: 1, c: 1, v: 1 }], "1D"),
    null
  );
  assert.equal(buildChartSeries(undefined, "1D"), null);
});

test("unsorted candles are ordered by open time before plotting", () => {
  const candles = syntheticCandles(40);
  const shuffled = [...candles].reverse();
  const chart = buildChartSeries(shuffled, "1W");
  assert.equal(chart.close, candles[candles.length - 1].c);
  assert.equal(chart.open, candles[0].o);
});

test("durations follow the visible candle span", () => {
  const oneDay = buildChartSeries(syntheticCandles(chartLimitFor("1D")), "1D");
  const oneWeek = buildChartSeries(syntheticCandles(chartLimitFor("1W")), "1W");
  assert.notEqual(oneDay.duration, oneWeek.duration);
  for (const chart of [oneDay, oneWeek]) {
    assert.match(chart.duration, /\d+ (hour|day)s?/);
  }
});
