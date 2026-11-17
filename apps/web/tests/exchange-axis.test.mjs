import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { formatChartAxis, buildChartSeries, chartPeriods, axisLabelFrame } =
  loadSource("src/app/exchange/chart-data.ts");

function syntheticCandles(count, startPrice) {
  const now = 1_700_000_000_000;
  let price = startPrice;
  return Array.from({ length: count }, (_, i) => {
    const close = price * (1 + Math.sin(i / 4) * 0.01 + 0.002);
    const open = price;
    price = close;
    return {
      t: now - (count - i) * 3_600_000,
      o: open,
      h: Math.max(open, close) * 1.001,
      l: Math.min(open, close) * 0.999,
      c: close,
      v: 5,
    };
  });
}

test("axis precision stays constant across ticks for every timeframe", () => {
  for (const period of chartPeriods) {
    const data = buildChartSeries(syntheticCandles(72, 100), period);
    assert.ok(data, `series for ${period}`);
    const digits = data.close < 2 ? 6 : 2;
    for (const value of [data.low, data.high, data.open, data.close]) {
      assert.match(
        formatChartAxis(value, data.close),
        new RegExp(`\\.\\d{${digits}}$`)
      );
    }
  }
  // Sub-dollar references keep six decimals; large ones two; supply stays compact.
  const cheap = buildChartSeries(syntheticCandles(30, 0.5), "1D");
  assert.match(formatChartAxis(cheap.close, cheap.close), /^\$\d+\.\d{6}$/);
  assert.equal(formatChartAxis(1, 1), "$1.000000");
  assert.equal(formatChartAxis(3500, 3500), "$3,500.00");
  assert.equal(formatChartAxis(1, 1, 1_000_000_000), "$1.00B");
});

test("axis labels delete from the right then type new digits without changing reserved width", () => {
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
