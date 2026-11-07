import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { planetDrift } = loadSource("src/libs/cinematic/planet-route.ts");

test("free planet drift remains bounded and continuous on desktop and mobile", () => {
  for (const aspect of [390 / 844, 1440 / 900]) {
    for (let i = 0; i < 12; i++) {
      for (let t = 0; t < 600; t += 0.1) {
        const a = planetDrift(t, i, aspect), b = planetDrift(t + 0.001, i, aspect);
        assert.ok(Math.abs(a.x) <= aspect * 0.9 + 1e-9);
        assert.ok(Math.abs(a.y) <= 0.78 + 1e-9);
        assert.ok(Math.hypot(b.x - a.x, b.y - a.y) <= 0.035001 * 0.001);
      }
    }
  }
});

test("planet drift has constant speed across the screen, including its center", () => {
  for (let i = 0; i < 12; i++) {
    for (let t = 1; t < 100; t += 0.37) {
      const a = planetDrift(t, i, 1.6), b = planetDrift(t + 0.00001, i, 1.6);
      assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) / 0.00001 - 0.035) < 1e-6);
    }
  }
});
