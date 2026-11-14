/** One object forms, holds, clears completely, then the next begins. */
export function hologramCycle(seconds: number, reducedMotion = false) {
  if (reducedMotion) return { kind: 0, reveal: 1, opacity: 1, time: 0 };
  const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const phase = time % 7;
  const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t*t*(3-2*t); };
  return {
    kind: Math.floor(time / 7) % 3,
    reveal: smooth(phase / 1.2),
    opacity: smooth(phase / 1.2) * (1 - smooth((phase - 4.8) / 1.3)),
    time,
  };
}
