/**
 * Lumen score derivation — API-side, deterministic, docs/03.
 *
 * v1 (owner-approved 2026-10-13) — recency-weighted accuracy × track record:
 *
 *   score = 100 × A × V
 *   A = Σᵢ γ^aᵢ · xᵢ / Σᵢ γ^aᵢ        γ = 2^(−1/30)  (30-day half-life)
 *   V = min(n, 50) / 50
 *
 * xᵢ ∈ {0,1} is execution i's outcome, aᵢ its age in days. Recent behavior
 * predicts future behavior better than ancient behavior: an execution's
 * weight halves every 30 days, so failures fade from the weighted average
 * as they age — but never leave the raw record (risk bands still count
 * every one). Track record stays a hard volume gate: a perfect 2-run
 * record still scores 4, not 100 — a Sybil identity can't borrow
 * credibility it hasn't earned.
 *
 * v0 (counts only, no timestamps) is kept below as the documented
 * approximation for sources that can't supply event ages.
 */

/** Executions older than this contribute a negligible vote. */
export const SCORE_HALF_LIFE_DAYS = 30;
/** Executions at/above this count give full track-record confidence. */
export const SCORE_FULL_CONFIDENCE = 50;
const SECONDS_PER_DAY = 86_400;

export interface ScoreEvent {
  /** true = SUCCESS attestation, false = FAIL. */
  success: boolean;
  /** Unix seconds, same clock as on-chain mintedAt. */
  timestamp: number;
}

/**
 * v1 score from timestamped events. `now` (unix seconds) is a required
 * parameter so tests stay deterministic. No events → undefined (UI N/A).
 */
export function deriveScoreV1(events: ScoreEvent[], now: number): number | undefined {
  const n = events.length;
  if (n === 0) return undefined;

  let weightSum = 0;
  let weightedSuccesses = 0;
  for (const event of events) {
    // Clock skew guard: future timestamps clamp to full weight.
    const ageDays = Math.max(0, (now - event.timestamp) / SECONDS_PER_DAY);
    const weight = Math.pow(2, -ageDays / SCORE_HALF_LIFE_DAYS);
    weightSum += weight;
    if (event.success) weightedSuccesses += weight;
  }

  const accuracy = weightSum > 0 ? weightedSuccesses / weightSum : 0;
  const trackRecord = Math.min(n, SCORE_FULL_CONFIDENCE) / SCORE_FULL_CONFIDENCE;
  return Math.round(100 * accuracy * trackRecord);
}

/**
 * v0 score from aggregate counts (docs/03 history — pre-timestamp sources).
 * Equivalent to v1 when every event is fresh; kept for the count-only path.
 */
export function deriveScoreV0(
  executions: number,
  failures: number,
): number | undefined {
  if (executions <= 0) return undefined;
  const successRate = Math.max(0, (executions - failures) / executions);
  const volumeConfidence = Math.min(executions, SCORE_FULL_CONFIDENCE) / SCORE_FULL_CONFIDENCE;
  return Math.round(100 * successRate * volumeConfidence);
}
