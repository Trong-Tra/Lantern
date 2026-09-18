import type { AgentIntent, DemoAgent, IntentDefinition } from "../types";

export const DEFAULT_QUERY = "Find an agent to swap MON → USDC";

export const INTENTS: Record<AgentIntent, IntentDefinition> = {
  swap: {
    label: "Token swap",
    example: DEFAULT_QUERY,
    permission: "Preview one token swap through a demo Monad route.",
    route: ["Your intent", "Verified identity", "Swap agent", "Monad"],
  },
  payment: {
    label: "Agent payment",
    example: "Find an agent to send a USDC payment",
    permission: "Preview a single payment to a fictional recipient.",
    route: ["Your intent", "Verified identity", "Payment agent", "Monad"],
  },
  bridge: {
    label: "Cross-chain bridge",
    example: "Find an agent to bridge USDC to Monad",
    permission: "Preview a cross-chain route using fictional assets.",
    route: ["Your intent", "Verified identity", "Bridge agent", "Monad"],
  },
};

export const DEMO_AGENTS: readonly DemoAgent[] = [
  {
    id: "demo-nebula-71f",
    name: "Nebula Agent",
    glyph: "N",
    role: "Swap routing",
    reputation: 94,
    executions: 4281,
    failures: 7,
    capabilities: ["swap"],
    description:
      "Finds a token swap route and compares execution history before presenting a scoped action for approval.",
  },
  {
    id: "demo-waypoint-82c",
    name: "Waypoint Agent",
    glyph: "W",
    role: "Cross-chain discovery",
    reputation: 92,
    executions: 2481,
    failures: 3,
    capabilities: ["swap", "bridge"],
    description:
      "Connects token routes across networks, exposing each agent identity and route dependency along the way.",
  },
  {
    id: "demo-meridian-35a",
    name: "Meridian Agent",
    glyph: "M",
    role: "Settlement & payments",
    reputation: 90,
    executions: 1862,
    failures: 6,
    capabilities: ["swap", "payment"],
    description:
      "Organizes swaps and payments into a single, reviewable execution path with clearly bounded permissions.",
  },
  {
    id: "demo-cinder-54b",
    name: "Cinder Agent",
    glyph: "C",
    role: "Payment orchestration",
    reputation: 96,
    executions: 6214,
    failures: 4,
    capabilities: ["payment"],
    description:
      "Prepares individual payments and makes the intended recipient, amount, and authorization scope visible before execution.",
  },
  {
    id: "demo-harbor-63d",
    name: "Harbor Agent",
    glyph: "H",
    role: "Asset movement",
    reputation: 89,
    executions: 1547,
    failures: 8,
    capabilities: ["payment", "bridge"],
    description:
      "Coordinates asset movement with a readable record of the identities and actions involved in the route.",
  },
  {
    id: "demo-passage-91e",
    name: "Passage Agent",
    glyph: "P",
    role: "Bridge routing",
    reputation: 95,
    executions: 3806,
    failures: 5,
    capabilities: ["bridge"],
    description:
      "Evaluates cross-chain routes against agent identity and historical execution signals before surfacing a path.",
  },
];

export function resolveIntent(query: string): AgentIntent | null {
  if (/\b(bridge|cross[- ]chain)\b/i.test(query)) return "bridge";
  if (/\b(payment|pay|send|transfer)\b/i.test(query)) return "payment";
  if (/\b(swap|exchange|trade)\b/i.test(query)) return "swap";
  if (/\bmon\b/i.test(query) && /\busdc\b/i.test(query)) return "swap";
  return null;
}

export function discoverAgents(intent: AgentIntent): readonly DemoAgent[] {
  return DEMO_AGENTS.filter((agent) =>
    agent.capabilities.includes(intent)
  ).sort((first, second) => second.reputation - first.reputation);
}
