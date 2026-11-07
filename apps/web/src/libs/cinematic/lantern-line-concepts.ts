/** Authored spatial scenes with causal signals, rather than interchangeable decorative curves. */
export const CONCEPT_STRANDS = 42;
export const CONCEPT_SEGMENTS = 96;
type Point = [number, number, number];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const p = clamp(v);
  return p * p * (3 - 2 * p);
};
const port: Point = [2.2222222222, -1.3157894737, 0.3];
const world = (p: Point): Point => [-2.9 + p[0] * 0.9, 0.9 + p[1] * 0.95, p[2]];
const mix = (a: Point, b: Point, t: number): Point =>
  a.map((v, i) => v + (b[i] - v) * t) as Point;
function trace(points: Point[], u: number): Point {
  const at = clamp(u) * (points.length - 1),
    i = Math.min(points.length - 2, Math.floor(at));
  return mix(points[i], points[i + 1], at - i);
}
function arc(a: Point, b: Point, u: number, bow = 0.18): Point {
  const p = mix(a, b, u);
  p[1] += Math.sin(u * Math.PI) * bow;
  return p;
}
export function conceptNode(chapter: number, index: number): Point {
  if (chapter === 4)
    return world([Math.sin(index * 2.1) * 0.6, 0.95 - index * 0.3, 0.1]);
  if (chapter === 5)
    return world([
      (index % 2 ? 1 : -1) * (0.55 + Math.floor(index / 2) * 0.3),
      -0.3 + Math.floor(index / 2) * 0.65,
      0,
    ]);
  if (chapter === 6)
    return world(
      index === 0
        ? [-1.35, -0.8, 0]
        : index === 1
          ? [1.3, 0.9, 0]
          : [-0.5, 0.9, 0]
    );
  if (chapter === 7)
    return world(
      [
        [-1.4, 0.1, -0.1],
        [-0.5, 0.9, 0.15],
        [0.5, 0.9, -0.1],
        [1.4, 0.1, 0.15],
      ][index % 4] as Point
    );
  if (chapter === 8) return world([1.3, ((index % 3) - 1) * 0.85, 0]);
  if (chapter === 9)
    return world(
      [
        [-0.4, -0.8, 0],
        [-1.3, 0.9, 0],
        [0, 1.25, 0],
        [1.3, 0.9, 0],
      ][index % 4] as Point
    );
  return world([
    (index % 2 ? 1 : -1) * 1.4,
    -0.6 + Math.floor(index / 2) * 0.35,
    0,
  ]);
}
/** Tilted orbital ribbons share the opening armillary's depth and unbroken motion. */
function orbit(
  u: number,
  radius: number,
  tilt: number,
  turn: number,
  center: Point = [0, 0, 0],
  eccentricity = 1
): Point {
  const a = u * Math.PI * 2,
    x = Math.cos(a) * radius,
    y = Math.sin(a) * radius * eccentricity;
  const depth = y * Math.sin(tilt),
    height = y * Math.cos(tilt);
  return [
    center[0] + x * Math.cos(turn) - depth * Math.sin(turn),
    center[1] + height,
    center[2] + x * Math.sin(turn) + depth * Math.cos(turn),
  ];
}
function rawLine(
  chapter: number,
  strand: number,
  u: number,
  time: number
): Point {
  const turn = (time * Math.PI) / 24;
  // The first six strands retain the actual signal routes and their arrival points.
  if (strand < 6) {
    if (chapter === 4)
      return arc(
        port,
        [Math.sin(strand * 2.1) * 0.6, 0.95 - strand * 0.3, 0.1],
        u,
        0.25
      );
    if (chapter === 5) {
      const leaf: Point = [
        (strand % 2 ? 1 : -1) * (0.55 + Math.floor(strand / 2) * 0.3),
        -0.3 + Math.floor(strand / 2) * 0.65,
        0,
      ];
      return arc(port, leaf, u, 0.35);
    }
    if (chapter === 6) {
      const lane = strand === 0 ? 0 : strand % 2 ? 1 : -1;
      return trace(
        [
          port,
          [-1.35, -0.8, 0],
          [-0.45, lane * 0.7, 0],
          [0.45, lane * 0.7, 0],
          [1.3, 0.9 + lane * 0.3, 0],
        ],
        u
      );
    }
    if (chapter === 7) {
      const nodes: Point[] = [
        port,
        [-1.4, 0.1, -0.1],
        [-0.5, 0.9, 0.15],
        [0.5, 0.9, -0.1],
        [1.4, 0.1, 0.15],
      ];
      return arc(nodes[strand % 4], nodes[(strand % 4) + 1], u, 0.12);
    }
    if (chapter === 8) {
      const lane = (strand % 3) - 1;
      return arc(port, [1.3, lane * 0.85, 0], u, 0.5 + lane * 0.25);
    }
    if (chapter === 9) {
      const hub: Point = [-0.4, -0.8, 0],
        candidates: Point[] = [
          [-1.3, 0.9, 0],
          [0, 1.25, 0],
          [1.3, 0.9, 0],
        ];
      return strand === 0
        ? arc(port, hub, u, 0.1)
        : arc(hub, candidates[(strand - 1) % 3], u, 0.18);
    }
    return arc(
      port,
      [(strand % 2 ? 1 : -1) * 1.4, -0.6 + Math.floor(strand / 2) * 0.35, 0],
      u,
      0.75
    );
  }
  const band = (strand - 6) % 18,
    family = Math.floor(band / 3),
    edge = ((band % 3) - 1) * 0.018 + (strand >= 24 ? -0.075 : 0);
  if (chapter === 4) {
    // An open celestial lens: six planes scan one coherent identity.
    return orbit(
      u,
      1.32 + edge,
      0.36 + family * 0.38,
      turn * 0.35 + family * 0.42,
      [0, 0.25, 0],
      0.88
    );
  }
  if (chapter === 5) {
    // Six earned records spiral into a growing, three-dimensional archive.
    const node = conceptNode(5, family),
      center: Point = [(node[0] + 2.9) / 0.9, (node[1] - 0.9) / 0.95, node[2]];
    return orbit(
      u,
      0.36 + edge,
      0.5 + family * 0.35,
      -turn * 0.35 + family * 0.5,
      center,
      0.8
    );
  }
  if (chapter === 6) {
    // A pair of orbital leaves opens around the authorized route.
    const opening = conceptResponse(chapter, time),
      side = family < 3 ? -1 : 1;
    return orbit(
      u,
      0.82 + edge,
      0.45 + (family % 3) * 0.42,
      side * (0.2 + opening * 0.8) + Math.sin(turn) * 0.14,
      [side * (0.38 + opening * 0.24), 0.15, 0],
      1.55
    );
  }
  if (chapter === 7) {
    // A continuous double helix carries the four sequential checkpoints.
    const angle = u * Math.PI * 4 + (family * Math.PI) / 3 + turn * 0.4;
    return [
      (u - 0.5) * 2.9,
      0.48 + Math.sin(angle) * (0.43 + edge),
      Math.cos(angle) * 0.55,
    ];
  }
  if (chapter === 8) {
    // Three independent tracks surround a rotating, braided settlement core.
    if (strand >= 24) {
      const angle = u * Math.PI * 2 + (band * Math.PI) / 9 + turn * 0.6;
      return [Math.cos(angle) * 0.38, (u - 0.5) * 2.6, Math.sin(angle) * 0.38];
    }
    return orbit(
      u,
      1.45 + edge,
      0.9 + (family % 3) * 0.23,
      0.22 + Math.floor(family / 3) * 0.2,
      [0, ((family % 3) - 1) * 0.56, 0],
      0.65
    );
  }
  if (chapter === 9) {
    // Three faceted answer crystals, rather than another set of circular orbits.
    const candidate=Math.min(2,Math.floor((strand-6)/12)),face=(strand-6)%12;
    const center:Point=[[-1.3,.9,0],[0,1.25,0],[1.3,.9,0]][candidate] as Point;
    const corners:Point[]=[[0,.48,0],[.3,0,0],[0,-.48,0],[-.3,0,0],[0,0,.3],[0,0,-.3]];
    const edgeIndex=face%4,tip=face<4?4:5;
    const path=face<8?[corners[tip],corners[edgeIndex],corners[(edgeIndex+1)%4],corners[tip]]:[corners[edgeIndex],corners[(edgeIndex+1)%4]];
    const local=trace(path,u),rotation=Math.sin(time*.23+candidate)*.22;
    return [center[0]+local[0]*Math.cos(rotation)+local[2]*Math.sin(rotation),center[1]+local[1],local[2]*Math.cos(rotation)-local[0]*Math.sin(rotation)];
  }

  // Two interlocking armillaries: distinct histories, a shared centre of trust.
  const side = family < 3 ? -1 : 1;
  return orbit(
    u,
    0.92 + edge,
    0.35 + (family % 3) * 0.65,
    side * turn * 0.3,
    [side * 0.65, 0.15, 0],
    1.1
  );
}
export function conceptLine(
  chapter: number,
  strand: number,
  u: number,
  time: number
): Point {
  return world(rawLine(chapter, strand, u, time));
}
export function conceptResponse(chapter: number, time: number) {
  const phase = (time % 12) / 12;
  if (chapter === 6)
    return smooth((phase - 0.12) / 0.12) * (1 - smooth((phase - 0.82) / 0.12));
  if (chapter === 9)
    return Math.sin(Math.PI * clamp((phase - 0.6) / 0.35)) ** 2;
  return Math.sin(Math.PI * phase) ** 4;
}
export function conceptStrength(
  chapter: number,
  strand: number,
  u: number,
  time: number
) {
  const phase = (time % 12) / 12;
  if (chapter === 4 && strand === 23) return smooth((phase - 0.72) * 10);
  if (chapter === 5) {
    const node = strand < 6 ? strand : Math.floor((strand - 6) / 2);
    const strength =
      strand >= 18
        ? 0.65
        : 0.15 + 0.85 * smooth((phase - (node * 0.12 + 0.13)) * 18);
    return strand < 6 && u < 0.66 ? strength / 6 : strength;
  }
  if (chapter === 6 && strand >= 16 && strand < 20)
    return 1 - conceptResponse(chapter, time) * 0.88;
  if (chapter === 7 && strand >= 4 && strand < 20)
    return (
      0.16 +
      0.84 *
        smooth(
          (phase - (0.05 + ((1 + Math.floor((strand - 4) / 4)) * 0.82) / 4)) *
            20
        )
    );
  if (chapter === 8 && strand >= 3)
    return 0.2 + 0.8 * smooth((phase - 0.45) * 12);
  if (chapter === 9 && strand > 0) {
    const selected =
      strand === 2 || (strand >= 18 && strand < 30);
    return phase < 0.6 ? 0.45 : selected ? 1 : 0.1;
  }
  return 0.68;
}
export function conceptPacket(
  chapter: number,
  index: number,
  time: number
): { point: Point; energy: number } {
  const phase = (time % 12) / 12;
  let strand = index,
    u = 0,
    energy = 0;
  if (chapter === 4 || chapter === 5) {
    const t = (phase - index * 0.12) / 0.13;
    u = smooth(t);
    energy = t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;
  }
  if (chapter === 6) {
    strand = index % 3;
    const t = (phase - 0.25 - index * 0.07) / 0.5;
    u = index === 0 ? smooth(t) : Math.sin(clamp(t) * Math.PI) * 0.48;
    energy =
      t > 0 && t < 1 ? (index === 0 ? 1 : 0.4) * Math.sin(Math.PI * t) : 0;
  }
  if (chapter === 7 && index === 0) {
    const t = clamp((phase - 0.05) / 0.82) * 4;
    strand = Math.min(3, Math.floor(t));
    u = t - strand;
    energy = phase > 0.05 && phase < 0.87 ? 1 : 0;
  }
  if (chapter === 8 && index < 3) {
    const t = (phase - 0.12) / 0.72;
    strand = index;
    u = smooth(t);
    energy = t > 0 && t < 1 ? Math.sin(Math.PI * t) : 0;
  }
  if (chapter === 9) {
    if (index === 0 && phase < 0.22) {
      strand = 0;
      u = smooth(phase / 0.22);
      energy = Math.sin((Math.PI * phase) / 0.22);
    } else if (index < 3 && phase >= 0.22 && phase < 0.58) {
      strand = index + 1;
      u = smooth((phase - 0.22) / 0.36);
      energy = Math.sin((Math.PI * (phase - 0.22)) / 0.36) * 0.75;
    } else if (index === 0 && phase >= 0.6 && phase < 0.95) {
      strand = phase < 0.8 ? 2 : 0;
      u =
        phase < 0.8
          ? 1 - smooth((phase - 0.6) / 0.2)
          : 1 - smooth((phase - 0.8) / 0.15);
      energy = Math.sin((Math.PI * (phase - 0.6)) / 0.35);
    }
  }
  if (chapter === 10 && index < 4) {
    strand = index;
    const t = (time / 7 + index * 0.25) % 1;
    u = index % 2 ? 1 - t : t;
    energy = Math.sin(Math.PI * t);
  }
  return { point: conceptLine(chapter, strand, u, time), energy };
}
