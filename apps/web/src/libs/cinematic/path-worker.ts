import { bakePathFrame } from "./path-frames";

addEventListener(
  "message",
  (event: MessageEvent<{ kind: number; frames: number[] }>) => {
    const { kind, frames } = event.data;
    for (const frame of frames) {
      const positions = bakePathFrame(kind, frame);
      postMessage({ kind, frame, positions }, { transfer: [positions.buffer] });
    }
  }
);
