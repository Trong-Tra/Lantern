/**
 * Pure helpers for the AgentVault deposit panel (docs/02).
 * No dependencies — exercised via tests/helpers/load-source.mjs.
 */

/** Returns an error message, or null when the input is a valid MON amount. */
export function validateMonAmount(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "Enter an amount";
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return "Amount must be a non-negative number";
  const decimals = trimmed.split(".")[1] ?? "";
  if (decimals.length > 18) return "MON supports at most 18 decimals";
  if (/^0(\.0*)?$/.test(trimmed)) return "Amount must be greater than 0";
  return null;
}
