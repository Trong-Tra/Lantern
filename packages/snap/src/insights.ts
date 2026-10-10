/**
 * Pure insight builders for the Lantern Snap — testable without MetaMask.
 * AgentLookupResult mirrors AgentSummary from @lantern/types; it is declared
 * locally so the snap bundle stays self-contained (MetaMask installs snaps
 * standalone from npm).
 */

export const MONAD_TESTNET_CAIP2 = "eip155:10143";

export interface AgentLookupResult {
  agentId: number;
  name: string;
  owner: string;
  risk: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  executions: number;
  failures: number;
  /** Absent until the scoring formula lands (docs/03) — UI shows N/A. */
  score?: number;
}

export interface InsightRow {
  label: string;
  value: string;
}

export interface InsightModel {
  title: string;
  context?: string;
  rows: InsightRow[];
}

/** Only Monad testnet is supported for now (docs/05). */
export function shouldInspect(chainId: string): boolean {
  return chainId === MONAD_TESTNET_CAIP2;
}

/** Returns the `to` address, or null for contract creation / malformed values. */
export function extractToAddress(transaction: { to?: string | null }): string | null {
  const { to } = transaction;
  return typeof to === "string" && /^0x[0-9a-fA-F]{40}$/.test(to) ? to : null;
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function buildAgentInsights(agent: AgentLookupResult): InsightModel {
  return {
    title: agent.name || `Agent #${agent.agentId}`,
    context: "Registered Lantern agent — verified via ERC-8004",
    rows: [
      { label: "Agent ID", value: `#${agent.agentId}` },
      { label: "Owner", value: truncateAddress(agent.owner) },
      { label: "Risk", value: agent.risk },
      { label: "Executions", value: String(agent.executions) },
      { label: "Failures", value: String(agent.failures) },
      { label: "Score", value: agent.score === undefined ? "N/A" : String(agent.score) },
    ],
  };
}

export function buildUnknownAgentInsights(to: string): InsightModel {
  return {
    title: "Unknown agent",
    context: `${truncateAddress(to)} is not a registered Lantern agent.`,
    rows: [{ label: "Proceed with caution", value: "No identity or reputation on record." }],
  };
}

export function buildUnsupportedChainInsights(chainId: string): InsightModel {
  return {
    title: "Unsupported network",
    context: `Lantern verification currently only follows Monad Testnet (received ${chainId}).`,
    rows: [],
  };
}

export function buildContractDeploymentInsights(): InsightModel {
  return {
    title: "Contract deployment",
    context: "No agent identity can be verified for a contract creation transaction.",
    rows: [],
  };
}

export function buildApiUnreachableInsights(): InsightModel {
  return {
    title: "Lantern API unreachable",
    context: "Identity lookup failed — check that the Lantern API is running.",
    rows: [],
  };
}
