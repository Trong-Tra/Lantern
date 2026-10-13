/**
 * v0 score derivation (owner-approved 2026-10-13, same home as risk: API-side,
 * docs/03): accuracy weighted by track record —
 *
 *   score = 100 × success_rate × min(executions, 50) / 50
 *
 * Transparent and deterministic like deriveRiskV0, so the UI and demo can
 * explain it. Agents with zero executions have no score at all (the UI
 * renders N/A): a fresh identity can't borrow credibility it hasn't earned —
 * two perfect runs score 4, not 100.
 */
export function deriveScoreV0(
  executions: number,
  failures: number,
): number | undefined {
  if (executions <= 0) return undefined;
  const successRate = Math.max(0, (executions - failures) / executions);
  const volumeConfidence = Math.min(executions, 50) / 50;
  return Math.round(100 * successRate * volumeConfidence);
}
