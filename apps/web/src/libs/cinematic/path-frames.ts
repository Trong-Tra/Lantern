import { sectionThreePath } from "./chapter-transition";
import {
  conceptLine,
  CONCEPT_STRANDS,
  CONCEPT_SEGMENTS,
} from "./lantern-line-concepts";

export const PATH_FPS = 15;
export const pathSegments = (kind: number) =>
  kind < 2 ? 48 : CONCEPT_SEGMENTS;
export const pathStrands = (kind: number) => (kind < 2 ? 32 : CONCEPT_STRANDS);

/** Prepared off the animation thread, including both ends of every curve. */
export function bakePathFrame(kind: number, frame: number) {
  const segments = pathSegments(kind);
  const data = new Float32Array(pathStrands(kind) * (segments + 1) * 3);
  const time = frame / PATH_FPS;
  for (let strand = 0; strand < pathStrands(kind); strand++) {
    for (let point = 0; point <= segments; point++) {
      const offset = (strand * (segments + 1) + point) * 3;
      if (kind < 2) {
        const p = sectionThreePath(
          strand,
          point / segments,
          strand < 16 ? 5 : 3,
          time,
          kind
        );
        data[offset] = p.x;
        data[offset + 1] = p.y;
        data[offset + 2] = p.z;
      } else
        data.set(conceptLine(kind, strand, point / segments, time), offset);
    }
  }
  return data;
}

export type PathFrames = {
  a: Float32Array;
  b: Float32Array;
  mix: number;
  segments: number;
};

export function samplePathFrame(
  frames: PathFrames,
  strand: number,
  u: number
): [number, number, number] {
  const at = Math.max(0, Math.min(1, u)) * frames.segments;
  const point = Math.min(frames.segments - 1, Math.floor(at));
  const offset = (strand * (frames.segments + 1) + point) * 3;
  const fraction = at - point;
  const result: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const a =
      frames.a[offset + axis] +
      (frames.a[offset + axis + 3] - frames.a[offset + axis]) * fraction;
    const b =
      frames.b[offset + axis] +
      (frames.b[offset + axis + 3] - frames.b[offset + axis]) * fraction;
    result[axis] = a + (b - a) * frames.mix;
  }
  return result;
}
