import {
  clamp,
  lerp,
  mapProgress,
  smoothstep,
  windowProgress,
} from "./progress";

export const cinematicState = {
  progress: 0,
  reducedMotion: false,
  mobile: false,
  ignition: 0,
  network: 0,
  soul: 0,
  reputation: 0,
  path: 0,
  execution: 0,
  executionFocus: 0,
  infrastructure: 0,
  finale: 0,
  lanternX: 1.8,
  lanternY: 0.1,
  lanternZ: 0,
  lanternScale: 1,
  lanternRotation: -0.3,
  cameraX: 0,
  cameraY: 0.15,
  cameraZ: 8,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
  beamX: 0,
  beamY: 0,
  beamZ: -3,
  lightScreenX: 50,
  lightScreenY: 50,
};

// Every spatial milestone is a pure sample of the one scrubbed scroll playhead.
const poses = [
  [0, 1.8, 0.1, 0, 1, 0, 0.15, 8],
  [0.12, 1.75, 0.1, 0, 1, 0, 0.1, 7.8],
  [0.23, -2.3, 0.25, -0.5, 0.76, 0.25, 0.3, 8.6],
  [0.33, -0.35, 0.6, 0.1, 0.65, 0.4, 0.2, 7.2],
  [0.43, -0.45, 0.1, -0.4, 0.72, -0.15, 0.3, 9.3],
  [0.55, -0.35, 0.3, 0, 0.72, 0.3, 0.25, 8.5],
  [0.66, -2.6, 1.1, -0.3, 0.65, 0, 0.5, 11.2],
  [0.77, -1.8, 0.6, 0.8, 0.64, 0.8, 0.1, 9.6],
  [0.86, -2.8, 0.9, -1, 0.7, 0, 0.65, 12.5],
  [0.93, -3.4, 0.6, -0.6, 0.7, 0, 0.2, 10],
  [1, 0, 2.8, -2, 0.8, 0, 0.5, 14],
];

export function updateCinematicState(progress: number) {
  progress = clamp(progress);
  const s = cinematicState;
  s.progress = progress;
  s.ignition = smoothstep(mapProgress(0.078, 0.12, progress));
  s.network = 0.04 + 0.68 * smoothstep(mapProgress(0.15, 0.25, progress));
  s.soul = windowProgress(0.27, 0.6, progress, 0.025);
  s.reputation = windowProgress(0.49, 0.61, progress, 0.015);
  s.path = smoothstep(mapProgress(0.6, 0.715, progress));
  s.execution = mapProgress(0.72, 0.815, progress);
  s.executionFocus = windowProgress(0.705, 0.835, progress, 0.015);
  s.infrastructure = windowProgress(0.82, 0.905, progress, 0.012);
  s.finale = smoothstep(mapProgress(0.962, 1, progress));
  const nextIndex = poses.findIndex((pose) => pose[0] >= progress);
  const index = nextIndex <= 0 ? 1 : nextIndex;
  const a = poses[index - 1];
  const b = poses[index];
  const t = smoothstep(mapProgress(a[0], b[0], progress));
  s.lanternX = lerp(a[1], b[1], t);
  s.lanternY = lerp(a[2], b[2], t);
  s.lanternZ = lerp(a[3], b[3], t);
  s.lanternScale = lerp(a[4], b[4], t);
  s.lanternRotation = -0.3 + progress * Math.PI * 4;
  s.cameraX = lerp(a[5], b[5], t);
  s.cameraY = lerp(a[6], b[6], t);
  s.cameraZ = lerp(a[7], b[7], t);
  s.beamX = Math.sin(progress * Math.PI * 12) * 3.2;
  s.beamY = Math.sin(progress * Math.PI * 4) * 0.8;
  const inspection = Math.max(
    windowProgress(0.27, 0.38, progress, 0.015),
    s.reputation
  );
  s.beamX = lerp(s.beamX, 1.55, inspection);
  s.beamY = lerp(s.beamY, 0.1, inspection);
  s.beamZ = lerp(-3, -2, inspection);
  // Lift the lantern out of the reputation labels' orbit in chapter 6.
  // Keep this adjustment local so discovery and its metadata stay unchanged.
  if (!s.mobile) {
    const reputationFraming = windowProgress(0.48, 0.61, progress, 0.02);
    s.lanternX = lerp(s.lanternX, -0.85, reputationFraming);
    s.lanternY = lerp(s.lanternY, 1.75, reputationFraming);
    s.lanternZ = lerp(s.lanternZ, -1, reputationFraming);
    s.lanternScale = lerp(s.lanternScale, 0.48, reputationFraming);
  }
  if (s.mobile) {
    s.beamX = lerp(Math.sin(progress * Math.PI * 12) * 1.6, 0.4, inspection);
    s.beamY = lerp(1.1, 1.55, inspection);
    s.lanternX *= 0.42;
    s.lanternY += 0.7;
    s.lanternScale *= 0.75;
    s.cameraZ += 2;
  }
  // Park above the execution graph, clear of both the editorial and route labels.
  s.lanternX = lerp(s.lanternX, s.mobile ? 1.25 : 3.6, s.executionFocus);
  s.lanternY = lerp(s.lanternY, s.mobile ? 3 : 2.25, s.executionFocus);
  s.lanternZ = lerp(s.lanternZ, -1, s.executionFocus);
  s.lanternScale = lerp(
    s.lanternScale,
    s.mobile ? 0.32 : 0.4,
    s.executionFocus
  );
  if (s.reducedMotion) {
    s.cameraX = 0;
    s.cameraY = 0;
    s.cameraZ = 11;
    s.lanternRotation = 0.3;
    s.lanternX = 1.7;
    s.lanternY = 0.5;
  }
}
