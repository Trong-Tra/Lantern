import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { chartPeriods, chartLimitFor, chartIntervalFor, buildChartSeries, CHART_INTERVAL } =
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

test("periods map to per-timeframe candle limits and feed intervals", () => {
  assert.equal(CHART_INTERVAL, "1h");
  assert.deepEqual(chartPeriods, ["5m", "1H", "1D", "1W", "1M", "All"]);
  assert.equal(chartLimitFor("5m"), 5);
  assert.equal(chartLimitFor("1H"), 60);
  assert.equal(chartLimitFor("1D"), 48);
  assert.equal(chartLimitFor("1W"), 336);
  assert.equal(chartLimitFor("1M"), 1440);
  assert.equal(chartLimitFor("All"), 4000);
  assert.equal(chartLimitFor("bogus"), 168);
  // 5m = last 5 minutes and 1H = last hour both ride the live 1m stream;
  // HL rejects sub-minute intervals, so 1m is the floor.
  assert.equal(chartIntervalFor("5m"), "1m");
  assert.equal(chartIntervalFor("1H"), "1m");
  assert.equal(chartIntervalFor("1D"), "1h");
  assert.equal(chartIntervalFor("bogus"), "1h");
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
    // Display candles bucket to ≤96 with honest OHLC bounds.
    assert.ok(chart.candles.length <= 96);
    assert.ok(chart.candles.length > 0);
    for (const candle of chart.candles) {
      assert.ok(candle.high >= Math.max(candle.open, candle.close));
      assert.ok(candle.low <= Math.min(candle.open, candle.close));
    }
    assert.equal(chart.timeLabels.length, 5);
    assert.match(chart.duration, /\d+ (hour|day)s?/);
    assert.equal(chart.baseline, chart.y(chart.open));
  }
});

test("display candles bucket down to the 96-candle cap", () => {
  const chart = buildChartSeries(syntheticCandles(300), "1M");
  assert.equal(chart.candles.length, 96);
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

test("timeframes over the same window yield distinct durations", () => {
  const oneDay = buildChartSeries(syntheticCandles(24), "1D");
  const oneWeek = buildChartSeries(syntheticCandles(168), "1W");
  assert.notEqual(oneDay.duration, oneWeek.duration);
  assert.match(oneDay.duration, /hour/);
  assert.match(oneWeek.duration, /day/);
});
