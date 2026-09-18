import { mapProgress, smoothstep, windowProgress } from "./progress";

export function discoveryBackdropFocus(progress: number) {
  return windowProgress(0.38, 0.495, progress, 0.015);
}

// NDC x coordinates: soften the network on the left, behind the editorial copy.
export function discoveryBackdropVisibility(focus: number, screenX: number) {
  return 1 - focus * smoothstep(mapProgress(0.15, 0.5, -screenX)) * 0.96;
}

// Reveal during the first half of chapter 5; stay readable until its exit.
// Sampling scroll directly also reverses the blur when returning to chapter 4.
export function discoveryReveal(progress: number) {
  const reveal = smoothstep(mapProgress(0.38, 0.435, progress));
  const exit = 1 - smoothstep(mapProgress(0.48, 0.49, progress));
  return {
    opacity: reveal * exit,
    blur: (1 - reveal) * 6,
    brightness: 0.55 + reveal * 0.45,
  };
}
