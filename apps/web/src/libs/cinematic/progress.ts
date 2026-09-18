export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
export const lerp = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;
export const mapProgress = (start: number, end: number, value: number) =>
  clamp((value - start) / (end - start));
export const smoothstep = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
export const windowProgress = (
  start: number,
  end: number,
  value: number,
  feather = 0.015
) =>
  smoothstep(mapProgress(start, start + feather, value)) *
  (1 - smoothstep(mapProgress(end - feather, end, value)));
