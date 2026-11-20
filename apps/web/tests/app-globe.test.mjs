import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";

const { globePoint, globeProjection, makeFlight } = loadSource("src/app/app/globe-scene.ts");

test("globe projection keeps its poles fixed throughout a spin", () => {
  const poles = [[0, 1, 0], [0, -1, 0]];
  const initial = globeProjection(0);
  const surface = globePoint(20, 35);

  for (const yaw of [-Math.PI, -0.8, 0.4, Math.PI]) {
    const project = globeProjection(yaw);
    assert.deepEqual(poles.map(project), poles.map(initial));
    assert.notDeepEqual(project(surface), initial(surface));
  }
});

test("a flight takes off from one agent, clears the globe, and arrives at another", () => {
  const nodes = [globePoint(-12, 31), globePoint(150, -23)];
  const { points, start, duration } = makeFlight(nodes, 100);
  const [first, last] = [points[0], points.at(-1)];
  const distance = (point) => Math.hypot(...point);
  const direction = (point) =>
    point.map((component) => component / distance(point));

  assert.equal(start, 100);
  assert.ok(duration > 0);
  assert.ok(points.every((point) => distance(point) >= 1));
  assert.ok(distance(points[40]) > 1.3);
  assert.ok(
    nodes.some((node) =>
      node.every((value, i) => Math.abs(value - direction(first)[i]) < 1e-9),
    ),
  );
  assert.ok(
    nodes.some((node) =>
      node.every((value, i) => Math.abs(value - direction(last)[i]) < 1e-9),
    ),
  );
  assert.notDeepEqual(direction(first), direction(last));
});

const { solverOrbits } = loadSource("src/app/app-solar/solar-scene.ts");

test("all eight tracks have matching ellipse proportions and even spacing", () => {
  assert.equal(solverOrbits.length, 8);
  const spacing = solverOrbits[1].path[0][0] - solverOrbits[0].path[0][0];
  assert.ok(spacing > .09);
  for (const [index, { path, point }] of solverOrbits.entries()) {
    const axis = (path[0][0] - path[72][0]) / 2;
    const center = (path[0][0] + path[72][0]) / 2;
    assert.ok(Math.abs(center / axis + .075) < 1e-9);
    assert.ok(Math.abs(path[36][1] / axis - .997) < 1e-9);
    assert.ok(Math.abs(((point[0] - center) / axis) ** 2 + (point[1] / path[36][1]) ** 2 - 1) < 1e-9);
    if (index > 0) {
      assert.ok(Math.abs(path[0][0] - solverOrbits[index - 1].path[0][0] - spacing) < 1e-9);
    }
  }
});

test("the fixed planets stay staggered around the Sun", () => {
  for (const [index, { point: [x, y] }] of solverOrbits.entries()) {
    for (const { point: [otherX, otherY] } of solverOrbits.slice(index + 1)) {
      assert.ok(Math.hypot(x - otherX, y - otherY) > .28);
    }
  }
});
