import { PATH_FPS, pathSegments, type PathFrames } from "./path-frames";

let worker: Worker | undefined;
const paths = new Map<number, Map<number, Float32Array>>();
const pending = new Set<string>();

function prepare(kind: number, frame: number) {
  if (!worker) return;
  const rows = paths.get(kind) ?? new Map<number, Float32Array>();
  paths.set(kind, rows);
  const frames: number[] = [];
  for (let next = frame; next <= frame + 5; next++) {
    const key = `${kind}:${next}`;
    if (rows.has(next) || pending.has(key)) continue;
    if (pending.size >= 72) break;
    pending.add(key);
    frames.push(next);
  }
  if (frames.length) worker.postMessage({ kind, frames });
  for (const old of rows.keys())
    if (old < frame - 3 || old > frame + 12) rows.delete(old);
}

export function startPathPrecompute(onFrame: () => void, onError: () => void) {
  worker = new Worker(new URL("./path-worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = ({
    data,
  }: MessageEvent<{
    kind: number;
    frame: number;
    positions: Float32Array;
  }>) => {
    pending.delete(`${data.kind}:${data.frame}`);
    paths.get(data.kind)?.set(data.frame, data.positions);
    onFrame();
  };
  worker.onerror = onError;
  for (const kind of [0, 1, 4, 5, 6, 7, 8, 9, 10]) prepare(kind, 0);
  return () => {
    worker?.terminate();
    worker = undefined;
    paths.clear();
    pending.clear();
  };
}

/** Look ahead 400ms; hold the last prepared pose if a slow device misses its deadline. */
export function getPathFrames(kind: number, time: number): PathFrames | null {
  const at = Math.max(0, time) * PATH_FPS,
    frame = Math.floor(at);
  prepare(kind, frame);
  const rows = paths.get(kind);
  if (!rows?.size) return null;
  let a = rows.get(frame),
    b = rows.get(frame + 1);
  if (!a) {
    let nearest = Infinity;
    for (const [index, row] of rows) {
      if (Math.abs(index - frame) < nearest) {
        nearest = Math.abs(index - frame);
        a = row;
      }
    }
    b = a;
  }
  return {
    a: a!,
    b: b ?? a!,
    mix: b ? at - frame : 0,
    segments: pathSegments(kind),
  };
}
