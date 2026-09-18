import { lerp, mapProgress, smoothstep, windowProgress } from "./progress";

export function pathBackdropFocus(progress: number) {
  return windowProgress(0.6, 0.72, progress, 0.015);
}

export function pathBackdropScreenX(focus: number, screenX: number) {
  // Spread the cluster across the rightmost 24%, with a small edge overflow.
  const edgeX = 0.52 + mapProgress(-1, 1, screenX) * 0.52;
  return lerp(screenX, edgeX, focus);
}

// Clear the right-hand route labels without dimming the selected path itself.
export function pathBackdropVisibility(focus: number, screenX: number) {
  return 1 - focus * smoothstep(mapProgress(-0.1, 0.3, screenX)) * 0.96;
}

export function pathLabelOpacity(progress: number, completed: number) {
  const reading = windowProgress(0.6, 0.735, progress, 0.015);
  return Math.max(0.34 + completed * 0.66, reading * 0.95);
}

const REJECTION_LABELS_END = 0.9;

export function pathRejectionLabelOpacity(index: number, evaluating: number) {
  return windowProgress(
    0.1 + index * 0.2,
    REJECTION_LABELS_END,
    evaluating,
    0.09
  );
}

export function pathIntentOffset(evaluating: number, distance = 48) {
  // All three rejection labels leave together before the intent lifts.
  const lift = smoothstep(mapProgress(REJECTION_LABELS_END, 1, evaluating));
  return (1 - lift) * distance;
}
