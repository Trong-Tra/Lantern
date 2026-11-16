import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { formatChartAxis, getChartData, chartPeriods } = loadSource(
  "src/app/exchange/chart-data.ts"
);

test("axis precision stays constant across ticks for every asset and timeframe", () => {
  for (const symbol of ["MON", "USDC", "ETH"]) {
    for (const period of chartPeriods) {
      const data = getChartData(symbol, period);
      const digits = data.close < 2 ? 6 : 2;
      for (const value of [data.low, data.high, data.open, data.close]) {
        assert.match(
          formatChartAxis(value, data.close),
          new RegExp(`\\.\\d{${digits}}$`)
        );
      }
    }
  }
  assert.equal(formatChartAxis(1, 1), "$1.000000");
  assert.equal(formatChartAxis(3500, 3500), "$3,500.00");
  assert.equal(formatChartAxis(1, 1, 1_000_000_000), "$1.00B");
});

test("axis labels delete from the right then type new digits without changing reserved width", () => {
  const { axisLabelFrame } = loadSource("src/app/exchange/chart-data.ts");
  const previous = "$3,500.00";
  const next = "$0.040000";
  assert.equal(axisLabelFrame(previous, next, 0).text, previous);
  assert.equal(axisLabelFrame(previous, next, 320).text.trim(), "");
  assert.equal(
    axisLabelFrame(previous, next, 160).text.trim(),
    previous.slice(0, 5)
  );
  assert.equal(
    axisLabelFrame(previous, next, 560).text.trim(),
    next.slice(0, 4)
  );
  assert.equal(axisLabelFrame(previous, next, 940).text, next);
  assert.equal(axisLabelFrame(previous, next, 940).spin, 0);
  for (let elapsed = 0; elapsed < 1000; elapsed += 20) {
    assert.equal(axisLabelFrame(previous, next, elapsed).text.length, 9);
  }
  assert.equal(axisLabelFrame("$1.00B", next, 320).text.length, next.length);
});

test("currency names use the same delete/type timeline, including fast interrupted switches", () => {
  const { axisLabelFrame } = loadSource("src/app/exchange/chart-data.ts");
  const previous = "Ethereum";
  const next = "USD Coin";
  assert.equal(axisLabelFrame(previous, next, 0).text, previous);
  assert.equal(axisLabelFrame(previous, next, 320).text.trim(), "");
  assert.equal(axisLabelFrame(previous, next, 560).text.trim(), "USD");
  assert.equal(axisLabelFrame(previous, next, 940).text, next);
  const interrupted = axisLabelFrame(previous, next, 160).text;
  assert.equal(axisLabelFrame(interrupted, "Monad", 0).text, interrupted);
  assert.equal(axisLabelFrame(interrupted, "Monad", 940).text.trim(), "Monad");
});
