import { mapProgress, smoothstep } from "./progress";

// Shared with the editorial list: scrolling in either direction samples the
// same sequence, rather than restarting an independent animation timer.
export const infrastructureLayerStart = (index: number) =>
  0.822 + index * 0.012;

export function infrastructureLayerReveal(index: number, progress: number) {
  const start = infrastructureLayerStart(index);
  return smoothstep(mapProgress(start, start + 0.009, progress));
}

export function infrastructureTransfer(index: number, progress: number) {
  const arrival = infrastructureLayerStart(index + 1);
  return smoothstep(mapProgress(arrival - 0.003, arrival, progress));
}
