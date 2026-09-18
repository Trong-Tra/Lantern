import { lerp, mapProgress, smoothstep } from "./progress";

export const finaleReadingFocus = (progress: number) =>
  smoothstep(mapProgress(0.956, 0.972, progress));

// Leave a restrained constellation at the edges, not behind the centered CTA.
// Keep these thresholds in sync with Atmosphere's screen-space shader mask.
export function finaleBackdropVisibility(
  focus: number,
  screenX: number,
  mobile: boolean
) {
  const edge = mobile
    ? 0
    : smoothstep(mapProgress(0.58, 0.95, Math.abs(screenX)));
  return lerp(1, lerp(0.015, 0.22, edge), focus);
}
