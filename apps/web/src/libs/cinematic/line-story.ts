import { ease } from "./chapter-transition";
import { sampleConceptLine } from "./lantern-sculpture";

function beaconPoint(t: number) {
  const angle = t * Math.PI * 8;
  const radius = 1.35 + 0.3 * Math.cos(t * Math.PI * 2);
  return [Math.cos(angle) * radius, (t - 0.5) * 2.7, Math.sin(angle) * radius];
}

export function linePiece(chapter: number, i: number, orbit = 0, seconds = 0): number[] {
  if (chapter >= 4 && chapter <= 10) return sampleConceptLine(chapter, i, seconds);
  const a = (i / 128) * Math.PI * 2,
    b = a + Math.PI / 64;
  let x = 0,
    y = 0,
    z = 0,
    u = 0,
    v = 0,
    w = 0;
  if (chapter === 0) {
    const angle = a + orbit;
    const end = angle + ((Math.PI * 2) / 128) * 0.78;
    return [
      Math.cos(angle) * 1.9,
      Math.sin(angle) * 1.9,
      0,
      Math.cos(end) * 1.9,
      Math.sin(end) * 1.9,
      0,
    ];
  } else if (chapter === 1) {
    // A coiled bronze beacon: a continuous band with a real inner opening.
    return [...beaconPoint(i / 128), ...beaconPoint((i + 1) / 128)];
  } else if (chapter === 3) {
    return [0, 0, 0, 0, 0, 0];
  } else if (chapter === 2) {
    const side = i < 64 ? -1 : 1,
      n = i % 64;
    x = side * (0.5 + (n / 64) * 1.8);
    u = x;
    z = -0.6;
    w = 0.6;
    y = v = -0.7;
  } else {
    const radius = 1.8 + (i % 3) * 0.14;
    const frequency = 1;
    x = Math.cos(a * frequency) * radius;
    y = Math.sin(a * frequency) * radius * 0.75;
    z = Math.sin(a) * 0.5;
    u = Math.cos(b * frequency) * radius;
    v = Math.sin(b * frequency) * radius * 0.75;
    w = Math.sin(b) * 0.5;
  }
  return [x, y, z, u, v, w];
}

/** Follow one horizontal approach, then the circle itself after reaching its edge. */
export function openingStripe(
  piece: number[],
  index: number,
  arrival: number,
  span: number
) {
  if (arrival >= 1) return piece;
  const radius = 1.9;
  const side = index % 2 === 0 ? -1 : 1;
  const entry = side < 0 ? Math.PI : 0;
  const target = Math.atan2(piece[1], piece[0]);
  const arc =
    (((target - entry) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const result = [];
  for (let endpoint = 0; endpoint < 2; endpoint++) {
    const length = ((Math.PI * 2) / 128) * 0.78 * radius;
    const distance =
      (-span + endpoint * length) * (1 - arrival) +
      (arc * radius + endpoint * length) * arrival;
    if (distance < 0) result.push(side * (radius - distance), 0, 0);
    else {
      const angle = entry + distance / radius;
      result.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }
  }
  return result;
}
/** Bend the same lines through a chapter-specific motion before they settle. */
export function lineHandoff(
  chapter: number,
  progress: number,
  index: number,
  piece: number[],
  sourceCircle = linePiece(0, index)
) {
  if (chapter === 0) {
    if (progress > 0 && progress < 0.18) {
      return circleExit(sourceCircle, index, ease(progress / 0.18));
    }
    if (progress >= 0.18 && progress <= 0.72) return firstStrandPiece(index);
    if (progress > 0.72 && progress < 0.78) {
      const release = ease((progress - 0.72) / 0.06);
      return firstStrandPiece(index).map((value, axis) =>
        axis % 3 === 0 ? value : value * (1 - release)
      );
    }
    if (progress >= 0.78 && progress < 1) {
      const travel = ease((progress - 0.78) / 0.22);
      const result = [];
      for (let endpoint = 0; endpoint < 2; endpoint++) {
        const t = (index + endpoint) / 128;
        const start = firstStrandPiece(index)[endpoint * 3];
        const entry = beaconPoint(0.5)[0];
        const approach = Math.abs(entry - start);
        const winding = Math.abs(t - 0.5) * 38;
        const distance = (approach + winding) * travel;
        if (distance < approach)
          result.push(start + Math.sign(entry - start) * distance, 0, 0);
        else
          result.push(
            ...beaconPoint(
              0.5 + (Math.sign(t - 0.5) * (distance - approach)) / 38
            )
          );
      }
      return result;
    }
    const fuse = ease(progress / 0.28) * (1 - ease((progress - 0.78) / 0.22));
    return piece.map((value, axis) => {
      const target = firstStrandPiece(index)[axis];
      return value + (target - value) * fuse;
    });
  }
  if (chapter === 3) return piece;
  const envelope = Math.sin(Math.PI * Math.max(0, Math.min(1, progress)));
  const phase = (index / 128) * Math.PI * 2;
  const motions = [
    0.85, -1.05, 1.2, 0, -1.1, 1.55, -0.85, 1.25, -1.35, 1.1, 1.5,
  ];
  const twist = (motions[chapter] ?? 0) * envelope;
  const out = piece.slice();
  for (let endpoint = 0; endpoint < 2; endpoint++) {
    const n = endpoint * 3;
    const x = piece[n],
      y = piece[n + 1],
      z = piece[n + 2];
    const angle = twist * (0.55 + index / 256);
    out[n] = x * Math.cos(angle) - y * Math.sin(angle);
    out[n + 1] = x * Math.sin(angle) + y * Math.cos(angle);
    if (chapter === 1 || chapter === 6)
      out[n] += Math.sign(x || 1) * envelope * 0.65;
    if (chapter === 5 || chapter === 8)
      out[n + 2] =
        z + Math.sin(phase * 2 + progress * Math.PI) * envelope * 1.3;
    if (chapter === 7 || chapter === 9)
      out[n + 1] += Math.sin(phase * 3) * envelope * 0.7;
  }
  return out;
}

/** Advance along the circumference until the exit, then along its horizontal lane. */
export function circleExit(source: number[], index: number, progress: number) {
  if (progress <= 0) return source;
  const target = firstStrandPiece(index);
  if (progress >= 1) return target;
  const radius = 1.9;
  const step = ((Math.PI * 2) / 128) * 0.78;
  const start = Math.atan2(source[1], source[0]);
  const lane = target[1];
  let exit =
    index % 2 === 0
      ? Math.PI - Math.asin(lane / radius)
      : Math.asin(lane / radius);
  while (exit < start + step) exit += Math.PI * 2;
  const exitX = Math.cos(exit) * radius;
  const distance = progress * (Math.PI * 2 * radius + 36);
  const result = [];
  for (let endpoint = 0; endpoint < 2; endpoint++) {
    const angle = start + endpoint * step;
    const arc = (exit - angle) * radius;
    if (distance < arc) {
      const moving = angle + distance / radius;
      result.push(Math.cos(moving) * radius, Math.sin(moving) * radius, 0);
    } else {
      const endX = target[endpoint * 3];
      const travel = Math.min(distance - arc, Math.abs(endX - exitX));
      result.push(exitX + Math.sign(endX - exitX) * travel, lane, 0);
    }
  }
  return result;
}

/** Two separated straight ribbons share the horizontal travel direction. */
export function firstStrandPiece(index: number) {
  const side = index % 2 === 0 ? -1 : 1;
  const segment = Math.floor(index / 2);
  return [
    -4 + (segment / 64) * 32,
    side * 1.2,
    0,
    -4 + ((segment + 1) / 64) * 32,
    side * 1.2,
    0,
  ];
}
/** Shared centerline for the bronze ribbon and the lantern tracking shot. */
export function firstRibbonPoint(t: number) {
  return [-4 + t * 32, 0, 0];
}
export function firstRibbonRide(progress: number) {
  const run = Math.max(0, Math.min(1, (progress - 0.28) / 0.44));
  const travel = run ** 3;
  const weight =
    ease((progress - 0.18) / 0.1) * (1 - ease((progress - 0.76) / 0.1));
  return { point: firstRibbonPoint(travel), weight };
}

/** Scroll-driven acceleration, brief lost visibility, then a clear arrival. */
export function firstStripeRush(progress: number) {
  const charge = ease((progress - 0.3) / 0.28);
  const release = 1 - ease((progress - 0.73) / 0.16);
  return {
    speed: charge * release,
    coverage:
      ease((progress - 0.45) / 0.12) * (1 - ease((progress - 0.86) / 0.1)),
  };
}
