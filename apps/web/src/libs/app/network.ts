/**
 * App network showcase — pure helpers (unit-tested, no React/config imports).
 *
 * Standing is earned attestation count — never a derived Elo/score formula
 * (MEMORY: no derived score/risk anywhere).
 */

export type AgentRecord = {
  id: string;
  owner: string;
  registeredAt: string;
  attestationCount: number;
  /** Canonical ERC-8004 singleton token id (dual-registration); null when not mapped. */
  canonicalTokenId: string | null;
};

/** Read the description from Lantern's canonical ERC-8004 registration format. */
export function readRegistrationAbout(uri: string): string | null {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) return null;

  try {
    const json = Buffer.from(uri.slice(prefix.length), "base64").toString("utf8");
    const { description } = JSON.parse(json) as { description?: unknown };
    if (typeof description !== "string") return null;
    const about = description.trim();
    return about && !/^(?:data:|0x[\da-f]+$|[a-z\d+/_-]{40,}={0,2}$)/i.test(about)
      ? about
      : null;
  } catch {
    return null;
  }
}

/** Parse a numeric ERC-8004 id; defaulting to 0 for non-numeric ids. */
export function numericAgentId(id: string): number {
  const value = Number.parseInt(id, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Canonical ERC-8004 scan agent URL (dual-registration — MEMORY 2026-11-15,
 * implemented 2026-11-18). 8004scan keys agents by chain SLUG, not the
 * numeric chain id, and by the canonical singleton token id, not our
 * AgentRegistry id — both verified live (15/15 pages).
 */
export const FUJI_8004SCAN_SLUG = "avalanche-fuji";

export function build8004scanAgentUrl(canonicalTokenId: string): string {
  return `https://testnet.8004scan.io/agents/${FUJI_8004SCAN_SLUG}/${canonicalTokenId}`;
}

/**
 * Verify URL for a standing-card agent — null when the agent has no
 * dual-registration mapping yet (the card hides the 8004scan button
 * instead of linking to someone else's token).
 */
export function agentVerifyUrl(
  agent: Pick<AgentRecord, "canonicalTokenId">,
): string | null {
  return agent.canonicalTokenId ? build8004scanAgentUrl(agent.canonicalTokenId) : null;
}

/** Short display form of an owner address. */
export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Standing board: agents sorted by earned attestations (desc), then by
 * numeric id (asc) for a stable board. Rank is 1-based position on that
 * board — not a computed rating.
 */
export function rankAgents(agents: ReadonlyArray<AgentRecord>): Array<AgentRecord & { rank: number }> {
  return [...agents]
    .sort((a, b) => {
      if (b.attestationCount !== a.attestationCount) {
        return b.attestationCount - a.attestationCount;
      }
      return numericAgentId(a.id) - numericAgentId(b.id);
    })
    .map((agent, index) => ({ ...agent, rank: index + 1 }));
}
