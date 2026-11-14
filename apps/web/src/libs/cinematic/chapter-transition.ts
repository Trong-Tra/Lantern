/** A reversible scroll score. One set of objects travels through every scene. */
export const SCENE_NAMES = [
  "The first light",
  "A signal found",
  "A soul revealed",
  "A path opens",
  "A network forms",
];
export const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));
export const ease = (value: number) => {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export function sampleJourney(
  value: number,
  { count = 5, hold = 0.25 }: { count?: number; hold?: number } = {}
) {
  const position = Number.isFinite(value) ? clamp(value, 0, count - 0.2) : 0;
  const from = Math.min(count - 1, Math.floor(position));
  const to = Math.min(count - 1, from + 1);
  const local = position - from;
  const mix = from === to ? 0 : ease((local - hold) / (1 - hold));
  const weights = Array<number>(count).fill(0);
  weights[from] = 1 - mix;
  if (to !== from) weights[to] = mix;
  return {
    position,
    from,
    to,
    local,
    mix,
    weights,
    active: mix > 0.5 ? to : from,
  };
}
export function scrollToScore(scroll: number, start: number, travel: number) {
  return clamp((scroll - start) / Math.max(1, travel)) * 4.8;
}
export const journeyState = {
  ...sampleJourney(0),
  reducedMotion: false,
  artResponse: 0,
  pointerX: 0,
  pointerY: 0,
  tail: 0,
  portal: 0,
  entranceAt: -1,
  ignitionAt: -1,
  candleScreenX: 0.5,
  candleScreenY: 0.56,
  transition: 0,
  chapters: [1, ...Array<number>(11).fill(0)],
};
// Stable particle destinations: the same signal is carried between each chapter.
export function signalPosition(
  scene: number,
  index: number
): [number, number, number] {
  const a = index * 2.399963,
    band = index % 3;
  if (scene === 0)
    return [
      Math.cos(a) * (3.6 + band * 0.5),
      Math.sin(a) * 3.1,
      Math.sin(a * 1.7) * 2 - 2,
    ];
  if (scene === 1)
    return [
      Math.cos(a) * (4 + (index % 5)),
      Math.sin(a) * 3.3,
      -3 - (index % 7) * 1.2,
    ];
  if (scene === 2) {
    const ring = 2.1 + band * 0.45;
    const orbit = (Math.floor(index / 3) * Math.PI) / 8;
    return [
      -1.9 + Math.cos(orbit) * ring,
      0.2 + Math.sin(orbit) * ring,
      Math.sin(orbit) * 0.5 - band * 0.3,
    ];
  }
  if (scene === 3) {
    const step = index / 47;
    return [
      Math.sin(step * Math.PI * 1.4) * 1.6 + (index % 2 ? 1.1 : -1.1),
      -1.3 + Math.sin(step * Math.PI) * 0.4,
      2 - step * 18,
    ];
  }
  return [
    Math.cos(a) * (3.2 + (index % 3) * 0.6),
    2.5 + Math.sin(a) * (0.8 + (index % 3) * 0.45),
    -3 - (index % 6) * 0.5,
  ];
}

/** Choreograph each content layer around the shared lantern handoff. */
export function contentBeat(mix: number, incoming: boolean, layer: number) {
  const delay = Math.min(layer, 8) * 0.012;
  const progress = incoming
    ? ease((mix - 0.52 - delay) / (0.48 - delay))
    : ease((mix - delay) / 0.42);
  return {
    presence: incoming ? progress : 1 - progress,
    travel: incoming ? 1 - progress : -progress,
  };
}
/** Distinct idle actions, expressed relative to the lantern's light. */
export function sectionTwoNode(index: number) {
  const angle = index * 2.399963;
  const radius = 2.4 + (index % 3) * 0.2;
  const height = 1 - (2 * (index + 0.5)) / 16;
  const ring = Math.sqrt(1 - height * height);
  return {
    x: Math.cos(angle) * ring * radius,
    y: height * radius * 0.85,
    z: Math.sin(angle) * ring * radius,
  };
}

/** Curved connections stay on the surrounding shell instead of cutting through it. */
export function sectionTwoPath(
  index: number,
  progress: number,
  step = 5,
  time = 0
) {
  const a = sectionTwoNode(index),
    b = sectionTwoNode((index + step) % 16);
  if (progress <= 0) return a;
  if (progress >= 1) return b;
  let x = a.x + (b.x - a.x) * progress;
  let y = (a.y + (b.y - a.y) * progress) / 0.85;
  let z = a.z + (b.z - a.z) * progress;
  const envelope = Math.sin(progress * Math.PI) * ease(time / 1.2);
  const bend =
    envelope * 0.32 * Math.sin(time * 0.55 + index * 0.8 + progress * 3);
  const turnX = x * Math.cos(bend) - z * Math.sin(bend);
  z = x * Math.sin(bend) + z * Math.cos(bend);
  x = turnX;
  y += envelope * 0.3 * Math.sin(time * 0.43 - progress * 5 + index);
  const radiusA = Math.hypot(a.x, a.y / 0.85, a.z);
  const radiusB = Math.hypot(b.x, b.y / 0.85, b.z);
  const radius =
    radiusA +
    (radiusB - radiusA) * progress +
    Math.sin(progress * Math.PI) * 0.3;
  const scale = radius / Math.max(0.001, Math.hypot(x, y, z));
  return { x: x * scale, y: y * scale * 0.85, z: z * scale };
}

/** Both visible assemblies keep moving throughout their handoff. */
export function networkClockRuns(
  chapters: number[]
) {
  return chapters[1] > 0 || chapters[2] > 0;
}

/** Scroll selects a chapter; elapsed time completes each adjacent handoff. */
export function advanceChapter(
  state: { chapter: number; next: number; elapsed: number },
  requested: number,
  delta: number
) {
  const target = Math.max(0, Math.min(11, Math.floor(requested)));
  let { chapter, next, elapsed } = state;
  if (chapter === next && chapter !== target) {
    next = chapter + Math.sign(target - chapter);
    elapsed = 0;
  }
  const duration = Math.max(
    chapter >= 4 && chapter <= 10 && next >= 4 && next <= 10 ? 3.4 : 2.4,
    Math.min(4.5, Math.abs(next - chapter) * 0.6)
  );
  if (chapter !== next) {
    elapsed = Math.min(duration, elapsed + Math.max(0, delta));
    if (elapsed >= duration) chapter = next;
  }
  // Traverse the whole interval so both forward and reverse handoffs meet at rest.
  const progress = ease(elapsed / duration);
  const position =
    chapter === next ? chapter : chapter + (next - chapter) * progress;
  return { chapter, next, elapsed, position };
}

/** Whole assemblies exchange visibility without detaching or remapping their strands. */
export function networkHandoff(progress: number) {
  const p = clamp(progress);
  return {
    outgoing: 1 - ease(p / 0.58),
    incoming: ease((p - 0.42) / 0.58),
    outgoingTurn: -ease(p) * 0.55,
    incomingTurn: (1 - ease(p)) * 0.55,
  };
}

/** Brightness, expansion and angular speed share one smooth breathing cycle. */
export function ringBreath(time: number) {
  const phase = time * 0.9;
  const swell = 0.5 - 0.5 * Math.cos(phase);
  return {
    swell,
    speed: 0.25 + swell * 1.5,
    rotation: time - (0.75 / 0.9) * Math.sin(phase),
  };
}

/** Existing network strands assemble into a slowly turning celestial armillary. */
export function sectionThreePath(
  index: number,
  progress: number,
  step = 5,
  time = 0,
  crossing = 0
) {
  const source = sectionTwoPath(index % 16, progress, step, time);
  const unfold = ease((crossing - (index % 4) * 0.035) / 0.78);
  const p = clamp(progress);
  let x: number, y: number, z: number;
  if (index < 24) {
    // Four quadrants per ring keep the original stars distributed around the form.
    const ring = Math.floor(index / 4);
    const breath = ringBreath(time);
    const rotationTime = breath.rotation;
    const spin = (ring * Math.PI) / 3 + rotationTime * (ring % 2 ? -0.46 : 0.4);
    const angle = (((index % 4) + p) * Math.PI) / 2 + rotationTime * 0.35;
    const radius = 2.15 + ring * 0.04 + breath.swell * 0.07;
    // Shallow axes keep the full rings outside the logo without masking any lines.
    const tilt =
      0.48 + ring * 0.035 + Math.sin(rotationTime * 0.35 + ring) * 0.045;
    const u = Math.cos(angle) * radius;
    const v = Math.sin(angle) * radius;
    x = u * Math.cos(spin) - v * Math.cos(tilt) * Math.sin(spin);
    y = u * Math.sin(spin) + v * Math.cos(tilt) * Math.cos(spin);
    z = v * Math.sin(tilt);
  } else {
    // Two closed cubic contours preserve the reference's rounded, open silhouette.
    const edge = index - 24;
    const inner = edge >= 4;
    const radius = inner ? 0.57 : 1.12;
    const handle = radius * (inner ? 0.91 : 0.3);
    const q = 1 - p;
    const u = 3 * q * q * p * handle + 3 * q * p * p * radius + p ** 3 * radius;
    const v = q ** 3 * radius + 3 * q * q * p * radius + 3 * q * p * p * handle;
    const angle = (-(edge % 4) * Math.PI) / 2 + (inner ? -0.28 : 0);
    x = u * Math.cos(angle) - v * Math.sin(angle);
    y = u * Math.sin(angle) + v * Math.cos(angle);
    z = 0;
  }
  const turn = -0.16 + Math.sin(time * 0.13) * 0.05;
  const target = {
    x: -1.7 + x * Math.cos(turn) + z * Math.sin(turn),
    y: 1 + y + Math.sin(time * 0.35) * 0.065,
    z: -1.8 - x * Math.sin(turn) + z * Math.cos(turn),
  };
  if (unfold === 1) return target;
  const lift = Math.sin(unfold * Math.PI) * 0.2;
  return {
    x: source.x + (target.x - source.x) * unfold,
    y: source.y + (target.y - source.y) * unfold + lift,
    z: source.z + (target.z - source.z) * unfold,
  };
}

export function agentPose(chapter: number, index: number, time: number) {
  const seed = ((index * 7919 + 1237) % 104729) / 104729;
  const angle = index * 2.399963;
  let x = 0,
    y = 0,
    z = 0,
    scale = 1;
  if (chapter === 0) {
    const cycle = 9 + seed * 7;
    const phase = ((time + seed * cycle * 2.7) % cycle) / cycle;
    const approach = ease((phase - 0.28) / 0.38);
    const radius = (2.5 + seed * 3.5) * (1 - approach);
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius * 0.7;
    z = Math.sin(angle * 1.7) * radius * 0.45;
    scale = ease(phase / 0.16) * (1 - ease((phase - 0.56) / 0.1));
  } else if (chapter === 1) {
    const travel =
      0.5 - 0.5 * Math.cos(Math.max(0, time - 1.2 - index * 0.08) * 0.65);
    const pose = sectionTwoPath(index, travel, 5, time);
    x = pose.x;
    y = pose.y;
    z = pose.z;
    scale = 0.85;
  } else if (chapter === 2) {
    x = (index % 2 ? 1 : -1) * (1.2 + seed * 1.3);
    y = -0.6 + Math.sin(time * 0.4 + angle) * 0.15;
    z = -seed * 2;
  } else if (chapter === 3) {
    const orbit = angle + time * (index % 2 ? -0.12 : 0.12);
    x = Math.cos(orbit) * 1.9;
    y = Math.sin(orbit) * 1.3;
    z = -0.8 + Math.sin(orbit) * 0.4;
  } else if (chapter === 4) {
    x = Math.sin(time * 0.5 + Math.floor(index / 4)) * 1.5;
    y = ((index % 4) - 1.5) * 0.55;
    z = -Math.floor(index / 4) * 0.4;
  } else if (chapter === 5) {
    x = (index - 7.5) * 0.3;
    y = Math.sin(index * 0.6) * 0.4;
    z = -1;
    scale = 0.5 + 0.5 * Math.max(0, Math.sin(time - index * 0.5));
  } else if (chapter === 6) {
    const progress = (time * 0.08 + seed) % 1;
    x = (index % 2 ? 1 : -1) * 0.8;
    y = -0.5;
    z = 1 - progress * 8;
    scale = Math.sin(progress * Math.PI);
  } else if (chapter === 7) {
    const step = (time * 0.4 + seed * 6) % 6;
    const progress = Math.floor(step) + ease(step % 1);
    x = (progress - 2.5) * 0.6;
    y = -1 + progress * 0.2;
    z = -progress * 0.4;
    scale = Math.sin((step / 6) * Math.PI);
  } else if (chapter === 8) {
    const orbit = angle + time * (index % 2 ? -0.18 : 0.18);
    x = Math.cos(orbit) * 1.5;
    y = -1.2 + (index % 5) * 0.6;
    z = Math.sin(orbit) * 1.5 - 1;
  } else if (chapter === 9) {
    x = Math.cos(angle + time * 0.12) * 1.6;
    y = Math.sin(angle + time * 0.12) * 1.2;
    z = Math.sin(time * 0.4 + angle) * 1.2;
  } else if (chapter === 10) {
    x = index % 2 ? 1.25 : -1.25;
    y = (Math.floor(index / 2) - 3.5) * 0.25;
    z = -0.6;
    scale = 0.65 + Math.sin(time * 0.6 + angle) ** 2 * 0.35;
  } else {
    x = Math.cos(angle) * (1.8 + seed);
    y = Math.sin(angle) * 1.1;
    z = -1 - seed * 1.5;
    scale = 0.65 + Math.sin(time * 0.8 - angle) ** 2 * 0.35;
  }
  return { x, y, z, scale };
}

export const HANDOFFS = [
  "Ignition",
  "Cross the divide",
  "Open the passport",
  "Universe within",
  "The inspecting eye",
  "Thread of memory",
  "Run the corridor",
  "Settlement wave",
  "Orbit the foundation",
  "Resolve the intention",
  "Release the constellation",
];
export function transitionFlight(chapter: number, progress: number) {
  const p = clamp(progress),
    s = Math.sin(p * Math.PI);
  // Lateral arcs and rolls let the forms change in view without a dolly reversal.
  const paths = [
    [1.4, 0.8, 0, 0.03],
    [4.2, 0, 0, -0.035],
    [-1.5, 1.4, 0, 0.08],
    [0, 0, 0, 0],
    [-3.1, 0.8, 0, -0.05],
    [Math.sin(p * Math.PI * 2) * 2.4, Math.cos(p * Math.PI * 2) * 0.9, 0, 0.08],
    [1.8, -0.9, 0, -0.04],
    [-1.8, 2, 0, 0.04],
    [2.8, -0.8, 0, 0.1],
    [-2.8, 1, 0, -0.07],
    [0.8, 1.5, 0, 0.025],
  ];
  return paths[Math.min(10, Math.max(0, chapter))].map((value) => value * s);
}

/** Depth of the camera and the continuing scene as it passes through the flame. */
export function universeDepth(
  chapters: number[],
  transition: number,
  progress: number
) {
  const inside = chapters.slice(4).reduce((sum, weight) => sum + weight, 0);
  const world =
    transition === 3 && inside > 0 ? ease((progress - 0.5) / 0.5) : inside;
  // Repeat the soul-to-universe approach, with a shorter dolly for each inner world.
  const stops = chapters.reduce(
    (sum, weight, chapter) => sum + weight * Math.max(0, Math.min(6, chapter - 4)),
    0
  );
  const travelling = transition >= 4 && transition < 10;
  const arrival = travelling
    ? transition - 4 + clamp(progress) ** 3
    : stops;
  return { camera: -24 * inside - 6.5 * stops, world: -24 * world - 6.5 * arrival };
}

/** Stars establish the scene, then lantern, then chapter objects and copy. */
export function entranceReveal(seconds: number) {
  return {
    lantern: ease((seconds - 0.45) / 1.1),
    objects: ease((seconds - 1.25) / 0.9),
  };
}

export function ignitionReveal(seconds: number) {
  return {
    flame: ease((seconds - 2.05) / 0.6),
    space: ease((seconds - 2.4) / 1.8),
    settle: ease((seconds - 4.3) / 1.2),
  };
}

/** Stagger the opening strands after ignition, finishing before copy appears. */
export function stripeArrival(seconds: number, index: number) {
  return ease((seconds - 2.8 - (index / 127) * 0.65) / 1.95);
}
export function currentIgnition() {
  if (journeyState.reducedMotion || journeyState.ignitionAt === 0)
    return { flame: 1, space: 1, settle: 1 };
  return ignitionReveal(
    journeyState.ignitionAt < 0
      ? 0
      : (performance.now() - journeyState.ignitionAt) / 1000
  );
}

/** Complete chapter objects occupy separate spaces; only their placement changes. */
export function chapterObjectTravel(chapter: number, chapters: number[]) {
  const score = chapters.reduce((sum, weight, index) => sum + index * weight, 0);
  const distance = chapter - score;
  const incoming = Math.max(0, distance), outgoing = Math.max(0, -distance);
  return {
    visible: distance > -1 && distance < 1,
    x: 10 * incoming * incoming - 80 * outgoing * outgoing,
    z: -500 * incoming ** 3 - 30 * outgoing * outgoing,
  };
}
