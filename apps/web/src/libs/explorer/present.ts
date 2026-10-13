/**
 * Explorer presentation helpers — pure, package-free (node:test loads these).
 * Score display lives in `formatScore` from @lantern/utils and the `ScoreGauge`
 * lumen ring (docs/04); v0 formula: scoring.ts (docs/03), API-side derivation.
 */

export type RiskTone = "low" | "medium" | "high" | "unknown";

export function riskTone(risk: string): RiskTone {
  switch (risk.toUpperCase()) {
    case "LOW":
      return "low";
    case "MEDIUM":
      return "medium";
    case "HIGH":
      return "high";
    default:
      return "unknown";
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Unix seconds → "YYYY-MM-DD HH:MM UTC". Falls back to "—" for missing values. */
export function formatUpdatedAt(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "—";
  const date = new Date(unixSeconds * 1000);
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    ` ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
}

/** Clamped page number for /explore?page=N — anything invalid falls back to 1. */
export function parsePage(raw: unknown): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Positive integer agent id or null (ids start at 1, matching the registry). */
export function parseAgentId(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.trim() === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
