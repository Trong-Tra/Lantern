import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { chartPeriods, getChartData } = loadSource(
  "src/app/exchange/chart-data.ts"
);
test("chart fixtures match displayed change and last price in every period", () => {
  for (const symbol of ["MON", "USDC", "ETH"])
    for (const period of chartPeriods) {
      const chart = getChartData(symbol, period);
      assert.equal(chart.points.length, 49);
      assert.equal(chart.candles.length, 16);
      for (const candle of chart.candles) {
        assert.ok(candle.high >= Math.max(candle.open, candle.close));
        assert.ok(candle.low <= Math.min(candle.open, candle.close));
      }
      assert.equal(chart.points[48].value, chart.close);
      assert.ok(
        Math.abs((chart.close / chart.open - 1) * 100 - chart.change) < 1e-8
      );
      for (const point of chart.points)
        assert.ok(
          Number.isFinite(point.y) &&
            point.y >= 20 &&
            point.y <= 230 &&
            point.value > 0
        );
      assert.ok(chart.low <= chart.open && chart.high >= chart.close);
    }
});
test("timeframes have distinct histories, including falling prices", () => {
  assert.equal(
    new Set(chartPeriods.map((period) => getChartData("MON", period).path))
      .size,
    6
  );
  assert.ok(getChartData("MON", "1W").change < 0);
  assert.ok(getChartData("MON", "1D").change < 0);
  assert.ok(getChartData("MON", "1D").close < getChartData("MON", "1D").open);
  assert.throws(() => getChartData("BAD", "1D"));
});
