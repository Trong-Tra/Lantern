import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { chartTransition } = loadSource("src/app/exchange/chart-data.ts");

test("chart retracts to origin before growing, with eased endpoints and bounded interruption", () => {
  assert.equal(chartTransition(0).progress, 1);
  assert.equal(chartTransition(320).progress, 0);
  assert.equal(chartTransition(940).progress, 1);
  assert.equal(chartTransition(2000).progress, 1);
  assert.equal(chartTransition(0, 0.4).progress, 0.4);
  assert.ok(1 - chartTransition(10).progress < 0.01);
  assert.ok(chartTransition(330).progress < 0.01);
  for (let t = 0; t <= 1000; t += 10) {
    const phase = chartTransition(t);
    assert.ok(phase.progress >= 0 && phase.progress <= 1);
    assert.equal(phase.shrinking, t < 320);
  }
});
