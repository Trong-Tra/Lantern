/**
 * App network showcase — pure helpers (unit-tested, no React/config imports).
 *
 * Map host pins are ILLUSTRATIVE only: we do not know where agents run.
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

export type AgentPin = {
  agentId: string;
  /** Illustrative longitude (degrees). */
  longitude: number;
  /** Illustrative latitude (degrees). */
  latitude: number;
  /** City label for the tooltip — not a host claim. */
  label: string;
};

/**
 * Deterministic illustrative host cities, cycled by numeric agent id.
 * Purely decorative placement for the map — never presented as geolocation.
 */
const ILLUSTRATIVE_PINS: ReadonlyArray<{ longitude: number; latitude: number; label: string }> = [
  { longitude: -74.006, latitude: 40.7128, label: "New York" },
  { longitude: -0.1276, latitude: 51.5072, label: "London" },
  { longitude: 13.405, latitude: 52.52, label: "Berlin" },
  { longitude: 55.2708, latitude: 25.2048, label: "Dubai" },
  { longitude: 72.8777, latitude: 19.076, label: "Mumbai" },
  { longitude: 139.6917, latitude: 35.6895, label: "Tokyo" },
  { longitude: 151.2093, latitude: -33.8688, label: "Sydney" },
  { longitude: -46.6333, latitude: -23.5505, label: "São Paulo" },
  { longitude: 103.8198, latitude: 1.3521, label: "Singapore" },
  { longitude: 37.6173, latitude: 55.7558, label: "Moscow" },
  { longitude: -122.4194, latitude: 37.7749, label: "San Francisco" },
  { longitude: 4.9041, latitude: 52.3676, label: "Amsterdam" },
];

/** Parse a numeric ERC-8004 id; NaN-safe (non-numeric ids pin at index 0). */
export function numericAgentId(id: string): number {
  const value = Number.parseInt(id, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

/** Illustrative pin for an agent id — cycles the city table by id. */
export function agentPin(agentId: string): AgentPin {
  const index = numericAgentId(agentId) % ILLUSTRATIVE_PINS.length;
  const pin = ILLUSTRATIVE_PINS[index];
  return { agentId, ...pin };
}

/** All illustrative pins for a set of agent ids (stable order by id). */
export function agentPins(agentIds: ReadonlyArray<string>): AgentPin[] {
  return [...agentIds].map(agentPin);
}

/**
 * Canonical ERC-8004 scan agent URL (dual-registration — MEMORY 2026-11-15,
 * implemented 2026-11-18). 8004scan keys agents by chain SLUG, not the
 * numeric chain id, and by the canonical singleton token id, not our
 * AgentRegistry id — both verified live (15/15 pages).
 */
export const FUJI_8004SCAN_SLUG = "avalanche-fuji";

export function build8004scanAgentUrl(canonicalTokenId: string): string {
  return `https://8004scan.io/agents/${FUJI_8004SCAN_SLUG}/${canonicalTokenId}`;
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
