import type { NetworkAgent } from "../types";

let seed = 92841;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

export const AGENTS: readonly NetworkAgent[] = Array.from(
  { length: 96 },
  (_, i) => {
    const verified = random() > 0.22;
    return {
      id: `0x${(0x71f + i * 37).toString(16).toUpperCase()}`,
      position: [
        (random() - 0.43) * 18,
        (random() - 0.5) * 9,
        -3 - random() * 11,
      ] as const,
      verified,
      reputation: Math.floor(
        verified ? 78 + random() * 21 : 18 + random() * 40
      ),
      executions: Math.floor(260 + random() * 5200),
      failures: Math.floor(random() * (verified ? 6 : 52)),
      soul: verified,
    };
  }
);

export const EDGES: readonly (readonly [number, number])[] = AGENTS.flatMap(
  (agent, i) =>
    AGENTS.slice(i + 1).flatMap((other, offset) => {
      const distance = Math.hypot(
        ...agent.position.map((value, axis) => value - other.position[axis])
      );
      return distance < 3.8 ? [[i, i + 1 + offset] as const] : [];
    })
);

export const HISTORY = [
  "Swap",
  "Payment",
  "Bridge",
  "Execution",
  "Execution",
  "Trade",
  "Payment",
] as const;
export const INFRASTRUCTURE = [
  "Agent network",
  "Lattern identity",
  "Reputation layer",
  "Execution layer",
  "Monad",
] as const;
export const WORLD_LABEL_STYLE = {
  fontFamily: "var(--font-mono), monospace",
  color: "#e6ba85",
  fontSize: "10px",
  letterSpacing: "0.11em",
  lineHeight: 1.7,
  whiteSpace: "nowrap",
  pointerEvents: "none",
} as const;
