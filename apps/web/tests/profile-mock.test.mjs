import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./helpers/load-source.mjs";
const fixtures = loadSource("src/app/profile/mock-data.ts");
test("mock portfolio totals and chart endpoints agree", () => {
  assert.equal(fixtures.mockTotal, 12650);
  for (const [period, values] of Object.entries(fixtures.mockChartValues)) {
    assert.equal(values.at(-1), fixtures.mockTotal);
    assert.match(fixtures.mockChartPath(period), /^M0 /);
    assert.ok(fixtures.mockChartPath(period).endsWith("L1000 40"));
    assert.ok(!/NaN|Infinity/.test(fixtures.mockChartPath(period)));
  }
  assert.equal(fixtures.mockOrders.length, 2);
});
