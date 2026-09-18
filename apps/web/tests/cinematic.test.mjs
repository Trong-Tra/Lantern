import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";

// Exercise the actual TS modules without adding a separate test runtime.
const cache = new Map();
function loadSource(relativePath) {
  const filename = path.resolve(import.meta.dirname, "..", relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const sourceModule = { exports: {} };
  cache.set(filename, sourceModule);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;
  const localRequire = (specifier) => {
    if (!specifier.startsWith("."))
      throw new Error(`Unexpected import: ${specifier}`);
    return loadSource(path.resolve(path.dirname(filename), `${specifier}.ts`));
  };
  new Function("require", "module", "exports", source)(
    localRequire,
    sourceModule,
    sourceModule.exports
  );
  return sourceModule.exports;
}

const math = loadSource("src/libs/cinematic/progress.ts");
const { finaleReadingFocus, finaleBackdropVisibility } = loadSource(
  "src/libs/cinematic/finale.ts"
);

test("finale shields the centered copy and CTA but retains a subtle edge constellation", () => {
  for (const mobile of [false, true]) {
    for (const x of [-1, -0.58, 0, 0.58, 1]) {
      assert.equal(finaleBackdropVisibility(0, x, mobile), 1);
      const visibility = finaleBackdropVisibility(1, x, mobile);
      assert.ok(visibility >= 0 && visibility <= 0.22 + 1e-12);
      if (mobile || Math.abs(x) <= 0.58) assert.ok(visibility < 0.02);
      assert.equal(visibility, finaleBackdropVisibility(1, -x, mobile));
    }
  }
  assert.ok(finaleBackdropVisibility(1, 1, false) > 0.2);
  for (const p of [0, 0.43, 0.77, 0.86, 0.93, 0.956])
    assert.equal(finaleReadingFocus(p), 0);
  assert.equal(finaleReadingFocus(1), 1);
  assert.ok(finaleReadingFocus(0.964) > 0 && finaleReadingFocus(0.964) < 1);
});
const infrastructure = loadSource("src/libs/cinematic/infrastructure.ts");

test("infrastructure layers reveal top to bottom and remain lit", () => {
  for (let i = 0; i < 5; i += 1) {
    const start = infrastructure.infrastructureLayerStart(i);
    assert.equal(infrastructure.infrastructureLayerReveal(i, start), 0);
    assert.equal(infrastructure.infrastructureLayerReveal(i, start + 0.009), 1);
    if (i < 4)
      assert.equal(
        infrastructure.infrastructureLayerReveal(i + 1, start + 0.009),
        0
      );
    for (let j = 0; j < i; j += 1)
      assert.equal(infrastructure.infrastructureLayerReveal(j, start), 1);
    assert.equal(infrastructure.infrastructureLayerReveal(i, 0.885), 1);
  }
});

test("infrastructure signal reaches each layer before that layer lights up", () => {
  for (let i = 0; i < 4; i += 1) {
    const arrival = infrastructure.infrastructureLayerStart(i + 1);
    assert.equal(infrastructure.infrastructureTransfer(i, arrival - 0.003), 0);
    assert.equal(infrastructure.infrastructureTransfer(i, arrival), 1);
    assert.equal(infrastructure.infrastructureLayerReveal(i + 1, arrival), 0);
    const middle = infrastructure.infrastructureTransfer(i, arrival - 0.0015);
    assert.ok(middle > 0 && middle < 1);
  }
});

test("infrastructure scroll samples are bounded and reversible", () => {
  const sample = (p) =>
    Array.from({ length: 5 }, (_, i) => [
      infrastructure.infrastructureLayerReveal(i, p),
      infrastructure.infrastructureTransfer(Math.min(i, 3), p),
    ]);
  const forward = Array.from({ length: 101 }, (_, i) => sample(i / 100));
  for (let i = 100; i >= 0; i -= 1) {
    assert.deepEqual(sample(i / 100), forward[i]);
    for (const values of forward[i])
      for (const value of values) assert.ok(value >= 0 && value <= 1);
  }
  assert.ok(
    sample(-1)
      .flat()
      .every((value) => value === 0)
  );
  assert.ok(
    sample(2)
      .flat()
      .every((value) => value === 1)
  );
});

test("left route checklist reveals top to bottom with the trusted route last", () => {
  const source = fs.readFileSync(
    path.resolve(
      import.meta.dirname,
      "../src/containers/lattern/components/scene-details.tsx"
    ),
    "utf8"
  );
  const checklist = source
    .split('className="route-checks"')[1]
    .split("</div>")[0];
  const starts = [...checklist.matchAll(/data-sequence="([.\d]+)"/g)].map(
    (match) => Number(match[1])
  );
  assert.equal(starts.length, 4);
  starts.forEach((start, index) => {
    if (index) assert.ok(start > starts[index - 1] + 0.009);
  });
  assert.equal(
    math.mapProgress(starts[3], starts[3] + 0.009, starts[2] + 0.009),
    0
  );
});
const {
  pathBackdropFocus,
  pathBackdropVisibility,
  pathBackdropScreenX,
  pathLabelOpacity,
  pathIntentOffset,
  pathRejectionLabelOpacity,
} = loadSource("src/libs/cinematic/path-visibility.ts");

test("rejection labels appear sequentially, remain visible, and leave together", () => {
  assert.equal(pathRejectionLabelOpacity(0, 0.2), 1);
  assert.equal(pathRejectionLabelOpacity(1, 0.2), 0);
  assert.equal(pathRejectionLabelOpacity(2, 0.2), 0);
  assert.equal(pathRejectionLabelOpacity(0, 0.4), 1);
  assert.equal(pathRejectionLabelOpacity(1, 0.4), 1);
  assert.equal(pathRejectionLabelOpacity(2, 0.4), 0);
  for (const progress of [0.6, 0.7, 0.8]) {
    for (const index of [0, 1, 2]) {
      assert.equal(pathRejectionLabelOpacity(index, progress), 1);
    }
  }
  const fading = pathRejectionLabelOpacity(0, 0.85);
  assert.ok(fading > 0 && fading < 1);
  for (const index of [0, 1, 2]) {
    assert.equal(pathRejectionLabelOpacity(index, 0.85), fading);
    assert.equal(pathRejectionLabelOpacity(index, 0.9), 0);
    assert.equal(pathRejectionLabelOpacity(index, 1), 0);
  }
});

test("intent stays lower until Unknown reputation disappears, then lifts reversibly", () => {
  for (const evaluating of [0, 0.5, 0.8, 0.85]) {
    assert.equal(pathIntentOffset(evaluating), 48);
  }
  assert.ok(pathRejectionLabelOpacity(2, 0.85) > 0);
  assert.equal(pathRejectionLabelOpacity(2, 0.9), 0);
  assert.ok(Math.abs(pathIntentOffset(0.9) - 48) < 1e-12);
  const middle = pathIntentOffset(0.95);
  assert.ok(middle > 0 && middle < 48);
  assert.equal(pathIntentOffset(1), 0);
  assert.equal(pathIntentOffset(0, 28), 28);
  assert.equal(pathIntentOffset(1, 28), 0);
  assert.equal(pathIntentOffset(0.95), middle);
  assert.equal(pathIntentOffset(0.8), 48);
});

test("chapter 7 spreads background dots across the right side reversibly", () => {
  for (const x of [-2, -1, -0.5, 0, 0.5, 1, 2]) {
    assert.equal(pathBackdropScreenX(0, x), x);
    const edge = pathBackdropScreenX(1, x);
    assert.ok(edge >= 0.52 - 1e-12 && edge <= 1.04 + 1e-12);
    const middle = pathBackdropScreenX(0.5, x);
    assert.ok(Math.abs(middle - (x + edge) / 2) < 1e-12);
  }
});

test("chapter 7 route labels stay readable before execution starts", () => {
  for (const progress of [0.62, 0.66, 0.7, 0.72]) {
    assert.ok(pathLabelOpacity(progress, 0) >= 0.95);
  }
  assert.equal(pathLabelOpacity(0.77, 0), 0.34);
  assert.equal(pathLabelOpacity(0.8, 1), 1);
});

test("chapter 7 dims the right backdrop without affecting other chapters", () => {
  const focus = pathBackdropFocus(0.66);
  assert.equal(focus, 1);
  assert.equal(pathBackdropVisibility(focus, -0.5), 1);
  assert.ok(pathBackdropVisibility(focus, 0.5) < 0.05);
  for (const progress of [0.435, 0.55, 0.72, 0.77, 1]) {
    assert.equal(pathBackdropVisibility(pathBackdropFocus(progress), 0.5), 1);
  }
  assert.ok(pathBackdropFocus(0.6075) > 0);
  assert.ok(pathBackdropFocus(0.6075) < 1);
});
const { discoveryReveal, discoveryBackdropFocus, discoveryBackdropVisibility } =
  loadSource("src/libs/cinematic/discovery.ts");

test("discovery dims only the left backdrop and restores it outside chapter 5", () => {
  const focus = discoveryBackdropFocus(0.435);
  assert.equal(focus, 1);
  assert.equal(discoveryBackdropVisibility(focus, 0.5), 1);
  assert.ok(discoveryBackdropVisibility(focus, -0.7) < 0.05);
  assert.ok(discoveryBackdropVisibility(focus, -0.3) > 0.05);
  for (const progress of [0.33, 0.51, 0.98]) {
    assert.equal(
      discoveryBackdropVisibility(discoveryBackdropFocus(progress), -0.7),
      1
    );
  }
});

test("discovery metadata sharpens and brightens, then remains readable", () => {
  const start = discoveryReveal(0.38);
  const middle = discoveryReveal(0.4075);
  const complete = discoveryReveal(0.435);
  assert.equal(start.opacity, 0);
  assert.equal(start.blur, 6);
  assert.ok(
    middle.opacity > start.opacity && middle.opacity < complete.opacity
  );
  assert.ok(middle.blur < start.blur && middle.blur > complete.blur);
  assert.ok(middle.brightness > start.brightness);
  assert.deepEqual(complete, { opacity: 1, blur: 0, brightness: 1 });
  assert.deepEqual(discoveryReveal(0.47), complete);
  assert.equal(discoveryReveal(0.49).opacity, 0);
  assert.deepEqual(discoveryReveal(0.4075), middle);
});
const { cinematicState, updateCinematicState } = loadSource(
  "src/libs/cinematic/runtime.ts"
);
const { resolveIntent, discoverAgents } = loadSource(
  "src/components/organisms/lattern-preview/constants/demo-agents.ts"
);
const { LATTERN_SCENES } = loadSource("src/constants/lattern-scenes.ts");

test("progress helpers clamp and feather both ends", () => {
  assert.equal(math.mapProgress(0.2, 0.4, 0), 0);
  assert.equal(math.mapProgress(0.2, 0.4, 1), 1);
  assert.ok(Math.abs(math.mapProgress(0.2, 0.4, 0.3) - 0.5) < 1e-12);
  assert.equal(math.smoothstep(-1), 0);
  assert.equal(math.smoothstep(2), 1);
  assert.equal(math.windowProgress(0.2, 0.4, 0.2), 0);
  assert.equal(math.windowProgress(0.2, 0.4, 0.3), 1);
  assert.equal(math.windowProgress(0.2, 0.4, 0.4), 0);
});

test("all 11 chapters form one continuous timeline", () => {
  assert.equal(LATTERN_SCENES.length, 11);
  assert.equal(LATTERN_SCENES[0].start, 0);
  assert.equal(LATTERN_SCENES.at(-1).end, 1);
  LATTERN_SCENES.forEach((scene, index) => {
    assert.ok(scene.start < scene.end);
    if (index) assert.equal(scene.start, LATTERN_SCENES[index - 1].end);
  });
});

for (const mobile of [false, true]) {
  test(`scroll samples reverse exactly (${mobile ? "mobile" : "desktop"})`, () => {
    cinematicState.mobile = mobile;
    cinematicState.reducedMotion = false;
    const forward = Array.from({ length: 1001 }, (_, index) => {
      updateCinematicState(index / 1000);
      const sample = { ...cinematicState };
      Object.values(sample)
        .filter((value) => typeof value === "number")
        .forEach((value) => assert.ok(Number.isFinite(value)));
      return sample;
    });
    for (let index = 1000; index >= 0; index -= 1) {
      updateCinematicState(index / 1000);
      assert.deepEqual(cinematicState, forward[index]);
    }
    assert.equal(forward[0].ignition, 0);
    assert.equal(forward[120].ignition, 1);
    assert.equal(forward[1000].finale, 1);
    assert.equal(forward[1000].execution, 1);
  });
}

test("runtime clamps scroll overshoot and resamples after resizing", () => {
  cinematicState.mobile = false;
  updateCinematicState(-0.1);
  assert.equal(cinematicState.progress, 0);
  updateCinematicState(1.1);
  assert.equal(cinematicState.progress, 1);
  updateCinematicState(0.33);
  const desktop = { ...cinematicState };
  cinematicState.mobile = true;
  updateCinematicState(0.33);
  assert.ok(cinematicState.lanternScale < desktop.lanternScale);
  cinematicState.mobile = false;
  updateCinematicState(0.33);
  assert.deepEqual(cinematicState, desktop);
});

test("chapter 8 parks the lantern above the graph and quiets the backdrop", () => {
  cinematicState.reducedMotion = false;
  for (const mobile of [false, true]) {
    cinematicState.mobile = mobile;
    for (const progress of [0.73, 0.77, 0.81]) {
      updateCinematicState(progress);
      assert.equal(cinematicState.executionFocus, 1);
      assert.ok(
        Math.abs(cinematicState.lanternX - (mobile ? 1.25 : 3.6)) < 1e-12
      );
      assert.ok(
        Math.abs(cinematicState.lanternY - (mobile ? 3 : 2.25)) < 1e-12
      );
      assert.ok(cinematicState.lanternScale <= 0.4 + 1e-12);
    }
    for (const progress of [0.435, 0.55, 0.66, 0.86, 1]) {
      updateCinematicState(progress);
      assert.equal(cinematicState.executionFocus, 0);
    }
  }
});

test("chapter 9 keeps the lantern above the infrastructure and quiets the backdrop", () => {
  cinematicState.reducedMotion = false;
  for (const mobile of [false, true]) {
    cinematicState.mobile = mobile;
    for (const progress of [0.84, 0.86, 0.89]) {
      updateCinematicState(progress);
      assert.equal(cinematicState.infrastructureFocus, 1);
      assert.ok(
        Math.abs(cinematicState.lanternX - (mobile ? 1.35 : 3.6)) < 1e-12
      );
      assert.ok(
        Math.abs(cinematicState.lanternY - (mobile ? 3.75 : 3.1)) < 1e-12
      );
      assert.ok(cinematicState.lanternScale <= 0.32 + 1e-12);
    }
    for (const progress of [0.435, 0.55, 0.66, 0.77, 0.93, 1]) {
      updateCinematicState(progress);
      assert.equal(cinematicState.infrastructureFocus, 0);
    }
  }
});

test("finale keeps its lantern above the closing content on desktop and mobile", () => {
  cinematicState.reducedMotion = false;
  for (const mobile of [false, true]) {
    cinematicState.mobile = mobile;
    for (const p of [0.98, 1]) {
      updateCinematicState(p);
      assert.equal(cinematicState.finaleFocus, 1);
      assert.ok(cinematicState.lanternY >= 3.4);
      assert.ok(cinematicState.lanternScale <= 0.46 + 1e-12);
    }
    updateCinematicState(0.93);
    assert.equal(cinematicState.finaleFocus, 0);
  }
});

test("chapter 6 keeps the lantern above and smaller than the history area", () => {
  cinematicState.mobile = false;
  cinematicState.reducedMotion = false;
  updateCinematicState(0.435);
  const discovery = { ...cinematicState };
  for (const progress of [0.51, 0.55, 0.58]) {
    updateCinematicState(progress);
    assert.equal(cinematicState.lanternY, 1.75);
    assert.equal(cinematicState.lanternX, -0.85);
    assert.equal(cinematicState.lanternZ, -1);
    assert.ok(cinematicState.lanternScale < discovery.lanternScale);
  }
  updateCinematicState(0.435);
  assert.deepEqual(cinematicState, discovery);
});

test("demo resolves supported intents without inventing unsupported matches", () => {
  assert.equal(resolveIntent("Swap MON → USDC"), "swap");
  assert.equal(resolveIntent("Send a USDC payment"), "payment");
  assert.equal(resolveIntent("Bridge USDC to Monad"), "bridge");
  assert.equal(resolveIntent(""), null);
  assert.equal(resolveIntent("Write a poem"), null);
});

test("each demo intent has three matching agents ranked by reputation", () => {
  for (const intent of ["swap", "payment", "bridge"]) {
    const agents = discoverAgents(intent);
    assert.equal(agents.length, 3);
    agents.forEach((agent, index) => {
      assert.ok(agent.capabilities.includes(intent));
      if (index) assert.ok(agents[index - 1].reputation >= agent.reputation);
    });
  }
});
