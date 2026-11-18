import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import { loadSource } from "./helpers/load-source.mjs";

test("artwork holds its prepared pose across worker delays and revisits", () => {
  let worker;
  class WorkerStub {
    constructor() { worker = this; }
    postMessage() {}
    terminate() {}
  }
  const source = fs.readFileSync("src/libs/cinematic/precomputed-paths.ts", "utf8")
    .replaceAll("import.meta.url", '"file:///path-worker.ts"');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", "Worker", compiled)(
    () => loadSource("src/libs/cinematic/path-frames.ts"), module, module.exports, WorkerStub,
  );
  const { startPathPrecompute, getPathFrames } = module.exports;
  const stop = startPathPrecompute(() => {}, () => {});
  assert.equal(getPathFrames(4, 0), null);
  const positions = new Float32Array([1, 2, 3]);
  worker.onmessage({ data: { kind: 4, frame: 0, positions } });
  assert.equal(getPathFrames(4, 0).a, positions);
  for (const time of [10, 20, 0, 200]) {
    const held = getPathFrames(4, time);
    assert.equal(held.a, positions);
    assert.equal(held.b, positions);
    assert.equal(held.mix, 0);
  }
  const next = new Float32Array([4, 5, 6]);
  worker.onmessage({ data: { kind: 4, frame: 3000, positions: next } });
  assert.equal(getPathFrames(4, 200).a, next);
  stop();
  assert.equal(getPathFrames(4, 200), null);
});
