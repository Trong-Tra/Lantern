import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const {
  sampleJourney,
  scrollToScore,
  signalPosition,
  contentBeat,
  agentPose,
  HANDOFFS,
  transitionFlight,
  stripeArrival,
} = loadSource("src/libs/cinematic/chapter-transition.ts");
test("opening stripes wait for ignition and settle before the welcome ends", () => {
  for (let i = 0; i < 128; i++) {
    assert.equal(stripeArrival(2.8, i), 0);
    assert.equal(stripeArrival(5.5, i), 1);
    let previous = 0;
    for (let seconds = 0; seconds <= 6; seconds += 0.05) {
      const progress = stripeArrival(seconds, i);
      assert.ok(progress >= previous - 1e-12 && progress <= 1 + 1e-12);
      previous = progress;
    }
  }
  assert.ok(stripeArrival(3.5, 0) > stripeArrival(3.5, 127));
});
test("stripes enter horizontally from both sides and keep a circular orbit", () => {
  const { linePiece, openingStripe } = loadSource(
    "src/libs/cinematic/line-story.ts"
  );
  for (let i = 0; i < 128; i++) {
    const circle = linePiece(0, i);
    const start = openingStripe(circle, i, 0, 20);
    const flight = openingStripe(circle, i, 0.4, 20);
    assert.equal(start[1], start[4]);
    assert.equal(start[1], 0);
    assert.equal(start[1], flight[1]);
    assert.equal(start[2], flight[2]);
    assert.ok(i % 2 === 0 ? start[0] < -17 : start[0] > 17);
    assert.deepEqual(openingStripe(circle, i, 1, 20), circle);
    let entered = false;
    for (let p = 0; p < 1; p += 0.01) {
      const pose = openingStripe(circle, i, p, 20);
      if (Math.abs(pose[0]) > 1.9) {
        assert.equal(pose[1], 0);
        assert.equal(entered, false);
      } else {
        entered = true;
        assert.ok(Math.abs(Math.hypot(pose[0], pose[1]) - 1.9) < 1e-12);
      }
    }
    const moving = linePiece(0, i, 0.8);
    assert.notDeepEqual(moving, circle);
    for (const p of [circle, moving])
      for (const n of [0, 3])
        assert.ok(Math.abs(Math.hypot(p[n], p[n + 1]) - 1.9) < 1e-12);
  }
});
test("every scroll sample preserves one visible scene and bounded handoff weights", () => {
  for (let x = -1; x < 6; x += 0.007) {
    const s = sampleJourney(x);
    assert.ok(s.from >= 0 && s.to <= 4);
    assert.ok(s.mix >= 0 && s.mix <= 1);
    assert.ok(Math.abs(s.weights.reduce((a, b) => a + b, 0) - 1) < 1e-10);
    assert.ok(s.weights[s.active] >= 0.5);
  }
});
test("objects arrive at the next scene without a position jump", () => {
  for (let boundary = 1; boundary <= 4; boundary++) {
    const before = sampleJourney(boundary - 1e-8),
      after = sampleJourney(boundary);
    for (let i = 0; i < 48; i++) {
      const a = signalPosition(before.from, i),
        b = signalPosition(before.to, i),
        dest = signalPosition(after.from, i);
      for (let axis = 0; axis < 3; axis++)
        assert.ok(
          Math.abs(a[axis] + (b[axis] - a[axis]) * before.mix - dest[axis]) <
            1e-7
        );
    }
  }
});
test("scroll scrubbing is reversible, including deep links and resize clamps", () => {
  const positions = [0, 0.4, 0.7, 1, 1.8, 3.6, 4.8];
  const forward = positions.map(sampleJourney);
  assert.deepEqual(
    [...positions].reverse().map(sampleJourney).reverse(),
    forward
  );
  assert.equal(scrollToScore(0, 0, 1000), 0);
  assert.equal(scrollToScore(500, 0, 1000), 2.4);
  assert.equal(scrollToScore(2000, 0, 1000), 4.8);
  assert.equal(scrollToScore(-50, 0, 1000), 0);
  assert.equal(sampleJourney(NaN).position, 0);
});
test("signals retain their identity through five distinct arrangements", () => {
  for (let scene = 0; scene < 5; scene++)
    for (let i = 0; i < 48; i++)
      assert.ok(signalPosition(scene, i).every(Number.isFinite));
  assert.notDeepEqual(signalPosition(1, 9), signalPosition(2, 9));
  assert.notDeepEqual(signalPosition(2, 9), signalPosition(3, 9));
});

test("handoffs start earlier and settle with zero endpoint velocity", () => {
  assert.ok(sampleJourney(0.4).mix > 0);
  assert.ok(sampleJourney(0.9).mix < 1);
  const h = 1e-4;
  assert.ok(sampleJourney(0.25 + h).mix / h < 1e-4);
  assert.ok((1 - sampleJourney(1 - h).mix) / h < 1e-4);
});

test("all twelve restored content chapters have bounded reversible handoffs", () => {
  for (let value = 0; value <= 11.8; value += 0.01) {
    const score = sampleJourney(value, { count: 12 });
    assert.equal(score.weights.length, 12);
    assert.ok(Math.abs(score.weights.reduce((a, b) => a + b, 0) - 1) < 1e-10);
    assert.ok(score.active >= 0 && score.active < 12);
  }
  assert.equal(sampleJourney(11.8, { count: 12 }).active, 11);
});

test("content layers hand off in order and settle fully readable", () => {
  for (let layer = 0; layer < 14; layer++) {
    assert.equal(contentBeat(0, true, layer).presence, 0);
    assert.equal(contentBeat(1, true, layer).presence, 1);
    assert.equal(contentBeat(0, false, layer).presence, 1);
    assert.equal(contentBeat(1, false, layer).presence, 0);
  }
  assert.ok(
    contentBeat(0.85, true, 0).presence > contentBeat(0.85, true, 5).presence
  );
  assert.ok(
    contentBeat(0.15, false, 0).presence < contentBeat(0.15, false, 5).presence
  );
});

test("opening lights awaken independently and disappear before restarting", () => {
  for (let i = 0; i < 16; i++) {
    const seed = ((i * 7919 + 1237) % 104729) / 104729;
    const cycle = 9 + seed * 7;
    const timeAt = (phase) => phase * cycle - seed * cycle * 2.7 + cycle * 3;
    assert.ok(agentPose(0, i, timeAt(0.08)).scale > 0);
    assert.equal(agentPose(0, i, timeAt(0.8)).scale, 0);
  }
});
test("every chapter has a distinct finite agent action", () => {
  const samples = [];
  for (let chapter = 0; chapter < 12; chapter++) {
    const poses = Array.from({ length: 16 }, (_, i) =>
      agentPose(chapter, i, 3.7)
    );
    assert.ok(poses.every((p) => Object.values(p).every(Number.isFinite)));
    samples.push(JSON.stringify(poses));
  }
  assert.equal(new Set(samples).size, 12);
});

test("chapter copy lingers into the handoff and returns before arrival", () => {
  assert.ok(contentBeat(0.2, false, 0).presence > 0);
  assert.ok(contentBeat(0.7, true, 0).presence > 0);
  assert.equal(contentBeat(1, true, 0).presence, 1);
});

test("eleven handoffs have distinct bounded camera routes and settle at rest", () => {
  assert.equal(HANDOFFS.length, 11);
  const routes = [];
  for (let chapter = 0; chapter < 11; chapter++) {
    assert.ok(transitionFlight(chapter, 0).every((v) => Math.abs(v) < 1e-10));
    assert.ok(transitionFlight(chapter, 1).every((v) => Math.abs(v) < 1e-10));
    const route = transitionFlight(chapter, 0.37);
    assert.ok(route.every(Number.isFinite));
    assert.equal(route[2], 0);
    routes.push(JSON.stringify(route));
  }
  assert.equal(new Set(routes).size, 11);
});

test("each line has a finite destination and morphs continuously between chapters", () => {
  const { linePiece } = loadSource("src/libs/cinematic/line-story.ts");
  for (let chapter = 0; chapter < 11; chapter++) {
    for (let i = 0; i < 128; i++) {
      const from = linePiece(chapter, i),
        to = linePiece(chapter + 1, i);
      assert.equal(from.length, 6);
      assert.ok(from.every(Number.isFinite) && to.every(Number.isFinite));
      const midpoint = from.map((value, axis) => value * 0.5 + to[axis] * 0.5);
      assert.ok(
        midpoint.every(
          (value, axis) => Math.abs(value - (from[axis] + to[axis]) / 2) < 1e-10
        )
      );
    }
  }
});

test("flame passage advances continuously into the inner world and settles there", () => {
  const { universeDepth } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  let last = 0;
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    const chapters = Array(12).fill(0);
    chapters[3] = 1 - p;
    chapters[4] = p;
    const depth = universeDepth(chapters, 3, p);
    assert.ok(depth.camera <= last + 1e-10);
    assert.ok(depth.world <= 0 && depth.world >= -24);
    last = depth.camera;
  }
  assert.equal(last, -24);
  const arrived = Array(12).fill(0);
  arrived[4] = 1;
  assert.deepEqual(universeDepth(arrived, 4, 0), { camera: -24, world: -24 });
});

test("chapter handoffs visibly move shared lines and return to their exact endpoints", () => {
  const { linePiece, lineHandoff } = loadSource(
    "src/libs/cinematic/line-story.ts"
  );
  for (let chapter = 0; chapter < 11; chapter++) {
    if (chapter === 3) continue;
    const piece = linePiece(chapter, 37);
    assert.deepEqual(lineHandoff(chapter, 0, 37, piece), piece);
    const end = lineHandoff(chapter, 1, 37, piece);
    assert.ok(
      end.every((value, axis) => Math.abs(value - piece[axis]) < 1e-10)
    );
    const middle = lineHandoff(chapter, 0.5, 37, piece);
    assert.ok(
      middle.some((value, axis) => Math.abs(value - piece[axis]) > 0.1)
    );
  }
});

test("transition ribbons remain straight after formation", () => {
  const { linePiece, lineHandoff, firstStrandPiece } = loadSource(
    "src/libs/cinematic/line-story.ts"
  );
  for (let i = 0; i < 128; i++) {
    for (const p of [0.18, 0.22, 0.28, 0.44, 0.6, 0.72]) {
      const straight = lineHandoff(0, p, i, linePiece(0, i));
      assert.deepEqual(straight, firstStrandPiece(i));
      assert.equal(straight[1], straight[4]);
      assert.equal(Math.abs(straight[2]), 0);
    }
  }
});

test("layered section two paths stay outside the lantern and meet their nodes", () => {
  const { sectionTwoNode, sectionTwoPath } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  for (const step of [3, 5])
    for (let i = 0; i < 16; i++) {
      assert.deepEqual(sectionTwoPath(i, 0, step), sectionTwoNode(i));
      assert.deepEqual(
        sectionTwoPath(i, 1, step),
        sectionTwoNode((i + step) % 16)
      );
      for (let n = 0; n <= 100; n++) {
        const p = sectionTwoPath(i, n / 100, step);
        const radius = Math.hypot(p.x, p.y / 0.85, p.z);
        assert.ok(
          Number.isFinite(radius) &&
            radius >= 2.4 - 1e-10 &&
            radius <= 3.1 + 1e-10
        );
      }
    }
});

test("section two stars stay on their evolving connections in both directions", () => {
  const { sectionTwoNode, sectionTwoPath, agentPose } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  const nodes = Array.from({ length: 16 }, (_, i) => sectionTwoNode(i));
  assert.ok(nodes.filter((node) => node.z > 0.8).length >= 4);
  assert.ok(nodes.filter((node) => node.z < -0.8).length >= 4);
  for (const node of nodes) {
    const radius = Math.hypot(node.x, node.y / 0.85, node.z);
    assert.ok(radius >= 2.4 - 1e-10 && radius <= 2.8 + 1e-10);
  }
  for (let i = 0; i < 16; i++) {
    const a = sectionTwoNode(i),
      b = sectionTwoNode((i + 5) % 16);
    const delay = 1.2 + i * 0.08;
    const period = (Math.PI * 2) / 0.65;
    const start = agentPose(1, i, 0);
    assert.equal(start.x, a.x);
    assert.equal(start.y, a.y);
    const far = agentPose(1, i, delay + period / 2);
    for (const axis of ["x", "y", "z"])
      assert.ok(Math.abs(far[axis] - b[axis]) < 1e-10);
    for (const fraction of [0.1, 0.25, 0.4]) {
      const outward = agentPose(1, i, delay + period * fraction);
      const returning = agentPose(1, i, delay + period * (1 - fraction));
      assert.ok(
        Math.hypot(outward.x, outward.y / 0.85, outward.z) >= 2.4 - 1e-10
      );
      for (const axis of ["x", "y", "z"]) {
        const travel = 0.5 - 0.5 * Math.cos(fraction * Math.PI * 2);
        const outPath = sectionTwoPath(i, travel, 5, delay + period * fraction);
        const backPath = sectionTwoPath(
          i,
          travel,
          5,
          delay + period * (1 - fraction)
        );
        assert.ok(Math.abs(outward[axis] - outPath[axis]) < 1e-10);
        assert.ok(Math.abs(returning[axis] - backPath[axis]) < 1e-10);
      }
    }
  }
});

test("network paths reshape smoothly with time while endpoints and clearance hold", () => {
  const { sectionTwoPath } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  for (let i = 0; i < 16; i++)
    for (const step of [3, 5]) {
      assert.notDeepEqual(
        sectionTwoPath(i, 0.5, step, 2),
        sectionTwoPath(i, 0.5, step, 5)
      );
      for (const endpoint of [0, 1])
        assert.deepEqual(
          sectionTwoPath(i, endpoint, step, 0),
          sectionTwoPath(i, endpoint, step, 30)
        );
      for (const time of [0, 1, 5, 20]) {
        const a = sectionTwoPath(i, 0.5, step, time);
        const b = sectionTwoPath(i, 0.5, step, time + 0.001);
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.01);
        assert.ok(Math.hypot(a.x, a.y / 0.85, a.z) >= 2.4 - 1e-10);
      }
    }
});

test("first handoff fuses into a shared ribbon before reforming the beacon", () => {
  const {
    linePiece,
    lineHandoff,
    firstRibbonPoint,
    firstRibbonRide,
    firstStrandPiece,
  } = loadSource("src/libs/cinematic/line-story.ts");
  for (const p of [0.44, 0.5, 0.72]) {
    for (let i = 0; i < 128; i++) {
      const from = linePiece(0, i),
        to = linePiece(1, i);
      const blended = from.map((v, axis) => v * (1 - p) + to[axis] * p);
      const band = lineHandoff(0, p, i, blended);
      const expected = firstStrandPiece(i);
      assert.ok(band.every((v, axis) => Math.abs(v - expected[axis]) < 1e-10));
    }
  }
  assert.equal(firstRibbonRide(0).weight, 0);
  assert.equal(firstRibbonRide(1).weight, 0);
  assert.ok(
    firstRibbonRide(0.5).point.every(
      (v, axis) => Math.abs(v - firstRibbonPoint(0.125)[axis]) < 1e-10
    )
  );
  assert.ok(firstRibbonRide(0.3).point[0] < firstRibbonRide(0.7).point[0]);
  const beacon = Array.from({ length: 128 }, (_, i) => linePiece(1, i));
  assert.ok(
    Math.max(...beacon.map((p) => p[2])) -
      Math.min(...beacon.map((p) => p[2])) >
      2
  );
});

test("transition ribbons remain separated, straight and continuous", () => {
  const { firstStrandPiece } = loadSource("src/libs/cinematic/line-story.ts");
  for (let n = 0; n < 64; n++) {
    const a = firstStrandPiece(n * 2),
      b = firstStrandPiece(n * 2 + 1);
    assert.equal(a[0], b[0]);
    assert.equal(a[1], -b[1]);
    for (const piece of [a, b]) {
      assert.equal(piece[1], piece[4]);
      assert.equal(piece[2], 0);
      assert.equal(piece[5], 0);
    }
    if (n < 63)
      for (const side of [0, 1])
        assert.deepEqual(
          firstStrandPiece(n * 2 + side).slice(3),
          firstStrandPiece((n + 1) * 2 + side).slice(0, 3)
        );
  }
});
test("a partial scroll leaves some pieces circling while others take the horizontal lane", () => {
  const { linePiece, circleExit } = loadSource(
    "src/libs/cinematic/line-story.ts"
  );
  let circling = 0,
    exited = 0;
  for (let i = 0; i < 128; i++) {
    const source = linePiece(0, i, 0.47);
    const pose = circleExit(source, i, 0.08);
    if (Math.abs(Math.hypot(pose[0], pose[1]) - 1.9) < 1e-10) circling++;
    else exited++;
  }
  assert.ok(circling > 0 && exited > 0);
});

test("circle pieces leave only after reaching their horizontal exit", () => {
  const { linePiece, lineHandoff, firstStrandPiece } = loadSource(
    "src/libs/cinematic/line-story.ts"
  );
  for (let i = 0; i < 128; i++) {
    const circle = linePiece(0, i);
    const target = firstStrandPiece(i);
    const source = linePiece(0, i, 0.47);
    for (let step = 0; step <= 18; step++) {
      const p = step / 100;
      const actual = lineHandoff(0, p, i, p === 0 ? source : circle, source);
      for (const n of [0, 3]) {
        const onCircle =
          Math.abs(Math.hypot(actual[n], actual[n + 1]) - 1.9) < 1e-10;
        const onLane = Math.abs(actual[n + 1] - target[n + 1]) < 1e-10;
        assert.ok(onCircle || onLane);
        assert.equal(actual[n + 2], 0);
      }
    }
    const pose = (p) => {
      const destination = linePiece(1, i);
      const blended = circle.map(
        (v, axis) => v * (1 - p) + destination[axis] * p
      );
      return lineHandoff(0, p, i, blended);
    };
    for (const p of [0.82, 0.9, 0.97]) {
      const arrival = pose(p);
      for (const n of [0, 3]) {
        if (arrival[n + 1] === 0) assert.equal(arrival[n + 2], 0);
        else {
          const t = arrival[n + 1] / 2.7 + 0.5;
          const radius = 1.35 + 0.3 * Math.cos(t * Math.PI * 2);
          assert.ok(
            Math.abs(arrival[n] - Math.cos(t * Math.PI * 8) * radius) < 1e-10
          );
          assert.ok(
            Math.abs(arrival[n + 2] - Math.sin(t * Math.PI * 8) * radius) <
              1e-10
          );
        }
      }
    }
    for (const boundary of [0, 0.18, 0.28, 0.44, 0.72, 0.78, 1]) {
      const before = pose(Math.max(0, boundary - 1e-8));
      const after = pose(Math.min(1, boundary + 1e-8));
      assert.ok(before.every((v, axis) => Math.abs(v - after[axis]) < 1e-4));
    }
  }
});

test("stripe rush accelerates, obscures the lantern briefly, then clears on arrival", () => {
  const { firstRibbonRide, firstStripeRush } = loadSource(
    "src/libs/cinematic/line-story.ts"
  );
  const x = (p) => firstRibbonRide(p).point[0];
  assert.ok(x(0.6) - x(0.5) > x(0.4) - x(0.3));
  assert.equal(firstStripeRush(0).coverage, 0);
  assert.equal(firstStripeRush(0.65).coverage, 1);
  assert.equal(firstStripeRush(1).coverage, 0);
  assert.equal(firstStripeRush(1).speed, 0);
  for (let p = 0; p <= 1; p += 0.01)
    assert.ok(
      Object.values(firstStripeRush(p)).every(
        (v) => Number.isFinite(v) && v >= 0 && v <= 1
      )
    );
});

test("first stripe runs to the right and masks the return into the next section", () => {
  const { firstRibbonRide, firstStripeRush } = loadSource(
    "src/libs/cinematic/line-story.ts"
  );
  let previous = firstRibbonRide(0.28).point[0];
  for (let p = 0.29; p <= 0.72; p += 0.01) {
    const x = firstRibbonRide(p).point[0];
    assert.ok(x > previous);
    previous = x;
  }
  assert.ok(previous > 20);
  assert.equal(firstStripeRush(0.85).coverage, 1);
  assert.ok(firstRibbonRide(0.86).weight < 1e-10);
});

test("welcome arrival reveals lantern before surrounding chapter objects", () => {
  const { entranceReveal } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  assert.deepEqual(entranceReveal(0), { lantern: 0, objects: 0 });
  assert.ok(entranceReveal(1).lantern > 0);
  assert.equal(entranceReveal(1).objects, 0);
  assert.deepEqual(entranceReveal(3), { lantern: 1, objects: 1 });
});

test("welcome sparks ignite the candle before light spreads and the scene settles", () => {
  const { ignitionReveal } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  assert.deepEqual(ignitionReveal(2), { flame: 0, space: 0, settle: 0 });
  assert.ok(ignitionReveal(2.3).flame > 0);
  assert.equal(ignitionReveal(2.3).space, 0);
  assert.equal(ignitionReveal(4).settle, 0);
  assert.deepEqual(ignitionReveal(6), { flame: 1, space: 1, settle: 1 });
});

test("network continuously gathers into a celestial armillary", () => {
  const { sectionTwoPath, sectionThreePath } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  for (let i = 0; i < 32; i++)
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      assert.deepEqual(
        sectionThreePath(i, t, 5, 4, 0),
        sectionTwoPath(i % 16, t, 5, 4)
      );
      let previous = sectionThreePath(i, t, 5, 4, 0);
      for (let p = 0.01; p <= 1; p += 0.01) {
        const point = sectionThreePath(i, t, 5, 4, p);
        assert.ok(Object.values(point).every(Number.isFinite));
        assert.ok(
          Math.hypot(
            point.x - previous.x,
            point.y - previous.y,
            point.z - previous.z
          ) < 0.25
        );
        previous = point;
      }
    }
  for (let ring = 0; ring < 6; ring++) {
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      const end = sectionThreePath(ring * 4 + quadrant, 1, 5, 3, 1);
      const next = sectionThreePath(
        ring * 4 + ((quadrant + 1) % 4),
        0,
        5,
        3,
        1
      );
      assert.ok(
        Math.hypot(end.x - next.x, end.y - next.y, end.z - next.z) < 1e-10
      );
    }
  }
  for (const start of [24, 28]) {
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      const end = sectionThreePath(start + quadrant, 1, 5, 0, 1);
      const next = sectionThreePath(start + ((quadrant + 1) % 4), 0, 5, 0, 1);
      assert.ok(
        Math.hypot(end.x - next.x, end.y - next.y, end.z - next.z) < 1e-10
      );
    }
  }
  const outer = sectionThreePath(24, 0, 5, 0, 1);
  const inner = sectionThreePath(28, 0, 5, 0, 1);
  assert.ok(outer.y > inner.y + 0.5);
  const centerAt = (t) =>
    Array.from({ length: 4 }, (_, q) => sectionThreePath(q, 0, 5, t, 1)).reduce(
      (sum, p) => ({
        x: sum.x + p.x / 4,
        y: sum.y + p.y / 4,
        z: sum.z + p.z / 4,
      }),
      { x: 0, y: 0, z: 0 }
    );
  const normalAt = (t) => {
    const c = centerAt(t),
      a = sectionThreePath(0, 0, 5, t, 1),
      b = sectionThreePath(1, 0, 5, t, 1);
    const u = [a.x - c.x, a.y - c.y, a.z - c.z],
      v = [b.x - c.x, b.y - c.y, b.z - c.z];
    return [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
  };
  assert.ok(Math.hypot(...normalAt(0).map((n, i) => n - normalAt(4)[i])) > 1);
  const depths = Array.from(
    { length: 24 },
    (_, i) => sectionThreePath(i, 0.5, 5, 0, 1).z
  );
  assert.ok(Math.max(...depths) - Math.min(...depths) > 1.6);
  assert.notDeepEqual(
    sectionThreePath(10, 0.5, 5, 0, 1),
    sectionThreePath(10, 0.5, 5, 4, 1)
  );
});

test("network clock advances at the settled chapter even when portal remains one", () => {
  const { networkClockRuns } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  assert.equal(networkClockRuns([0, 0, 1]), true);
  assert.equal(networkClockRuns([0, 1, 0]), true);
  assert.equal(networkClockRuns([0, 0.5, 0.5]), true);
  assert.equal(networkClockRuns([1, 0, 0]), false);
});

test("network handoff exchanges intact assemblies and reverses deterministically", () => {
  const { networkHandoff } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  assert.deepEqual(networkHandoff(0), {
    outgoing: 1,
    incoming: 0,
    outgoingTurn: -0,
    incomingTurn: 0.55,
  });
  assert.deepEqual(networkHandoff(1), {
    outgoing: 0,
    incoming: 1,
    outgoingTurn: -0.55,
    incomingTurn: 0,
  });
  const samples = Array.from({ length: 101 }, (_, i) =>
    networkHandoff(i / 100)
  );
  samples.forEach((pose, i) => {
    assert.deepEqual(networkHandoff(i / 100), pose);
    assert.ok(pose.incoming >= 0 && pose.incoming <= 1);
    assert.ok(pose.outgoing >= 0 && pose.outgoing <= 1);
    if (i) {
      assert.ok(pose.incoming >= samples[i - 1].incoming);
      assert.ok(pose.outgoing <= samples[i - 1].outgoing);
    }
  });
});

test("ring axes keep a natural open center and breathing drives rotation speed", () => {
  const { sectionThreePath, ringBreath } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  for (let time = 0; time < 40; time += 0.5) {
    const breath = ringBreath(time);
    const dt = 0.0001;
    const velocity =
      (ringBreath(time + dt).rotation - ringBreath(time - dt).rotation) /
      (2 * dt);
    assert.ok(Math.abs(velocity - breath.speed) < 1e-6);
    assert.ok(breath.speed >= 0.25 && breath.speed <= 1.75);
    for (let ring = 0; ring < 6; ring++)
      for (let sample = 0; sample < 24; sample++) {
        const point = sectionThreePath(ring * 4, sample / 23, 5, time, 1);
        const centerY = 1 + Math.sin(time * 0.35) * 0.065;
        assert.ok(Math.hypot(point.x + 1.7, point.y - centerY) > 1.45);
      }
  }
});

test("chapter buffer holds and triggered transitions finish without more scrolling", () => {
  const { advanceChapter } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  let state = { chapter: 0, next: 0, elapsed: 0 };
  for (const scroll of [0, 0.3, 0.8, 0.99]) {
    state = advanceChapter(state, scroll, 0.05);
    assert.equal(state.position, 0);
  }
  state = advanceChapter(state, 1, 0.05);
  assert.ok(state.position > 0 && state.position < 1);
  for (let i = 0; i < 50; i++) state = advanceChapter(state, 1, 0.05);
  assert.equal(state.position, 1);
  for (let i = 0; i < 50; i++) state = advanceChapter(state, 0.8, 0.05);
  assert.equal(state.position, 0);
  for (let i = 0; i < 800; i++) {
    const previous = state.position;
    state = advanceChapter(state, 11.8, 0.05);
    assert.ok(state.position >= previous && state.position <= 11);
  }
  assert.equal(state.position, 11);
});

test("settled fourth chapter stays in front of the fog before the portal opens", () => {
  const { universeDepth } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  const chapters = Array(12).fill(0);
  chapters[3] = 1;
  const depth = universeDepth(chapters, 3, 1);
  assert.ok(depth.camera === 0 && depth.world === 0);
});

test("chapter handoffs have no position jump at either boundary in either direction", () => {
  const { advanceChapter } = loadSource(
    "src/libs/cinematic/chapter-transition.ts"
  );
  for (let chapter = 0; chapter < 12; chapter++) {
    for (const direction of [-1, 1]) {
      const target = chapter + direction;
      if (target < 0 || target > 11) continue;
      const start = { chapter, next: target, elapsed: 0 };
      assert.equal(advanceChapter(start, target, 0).position, chapter);
      let state = { ...start, position: chapter };
      for (let i = 0; i < 240; i++) {
        const next = advanceChapter(state, target, 1 / 120);
        assert.ok(Math.abs(next.position - state.position) < 0.02);
        state = next;
      }
      // Longer celestial handoffs settle after 3.4 seconds.
      for (let i = 0; i < 180; i++)
        state = advanceChapter(state, target, 1 / 120);
      assert.equal(state.position, target);
    }
  }
});

test("live scroll responds before the old hold and never queues movement", () => {
  const options = { count: 12, hold: 0 };
  assert.ok(sampleJourney(0.1, options).mix > 0);
  const stopped = sampleJourney(7.4, options);
  for (let frame = 0; frame < 600; frame++) {
    assert.deepEqual(sampleJourney(7.4, options), stopped);
  }
  assert.ok(sampleJourney(7.3, options).mix < stopped.mix);
  assert.equal(sampleJourney(10, options).active, 10);
});


test("inner worlds approach in depth and meet continuously at each chapter", () => {
  const { universeDepth } = loadSource("src/libs/cinematic/chapter-transition.ts");
  for (let chapter = 4; chapter < 10; chapter++) {
    let previous = Infinity;
    for (let step = 0; step <= 100; step++) {
      const progress = step / 100;
      const weights = Array(12).fill(0);
      weights[chapter] = 1 - progress;
      weights[chapter + 1] = progress;
      const depth = universeDepth(weights, chapter, progress);
      assert.ok(depth.camera <= previous);
      assert.ok(depth.world - depth.camera >= -1e-9);
      assert.ok(depth.world - depth.camera < 4.5);
      assert.deepEqual(universeDepth(weights, chapter, progress), depth);
      previous = depth.camera;
      if (step === 0 || step === 100) {
        assert.equal(depth.camera, depth.world);
        assert.equal(depth.camera, -24 - 6.5 * (chapter - 4 + progress));
      }
    }
  }
  const last = Array(12).fill(0); last[11] = 1;
  assert.deepEqual(universeDepth(last, 10, 1), { camera: -63, world: -63 });
});


test("later artwork travels as separate complete objects through space", () => {
  const { chapterObjectTravel } = loadSource("src/libs/cinematic/chapter-transition.ts");
  for(let chapter=4;chapter<10;chapter++) {
    const settled=Array(12).fill(0);settled[chapter]=1;
    assert.deepEqual(chapterObjectTravel(chapter,settled),{visible:true,x:0,z:-0});
    for(let step=1;step<100;step++) {
      const p=step/100,weights=Array(12).fill(0);
      weights[chapter]=1-p;weights[chapter+1]=p;
      const outgoing=chapterObjectTravel(chapter,weights),incoming=chapterObjectTravel(chapter+1,weights);
      assert.ok(outgoing.visible && incoming.visible);
      assert.ok(outgoing.x<0 && incoming.x>0);
      assert.ok(incoming.z<0);
      assert.ok(Object.values(outgoing).every(v=>typeof v==='boolean'||Number.isFinite(v)));
    }
    const next=Array(12).fill(0);next[chapter+1]=1;
    assert.deepEqual(chapterObjectTravel(chapter+1,next),{visible:true,x:0,z:-0});
    assert.equal(chapterObjectTravel(chapter,next).visible,false);
  }
});
