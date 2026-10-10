import type { AgentProfile, AgentSummary, Attestation, RiskReport } from "@lantern/types";
import { createMockAgentRepository } from "../data/mockAgents.js";

export interface Page<T> {
  items: T[];
  total: number;
}

/**
 * Data-access contract for agents (docs/03).
 * All reads go through this interface so the data source can be swapped in one place.
 */
export interface AgentRepository {
  listAgents(page: number, limit: number): Promise<Page<AgentSummary>>;
  getAgent(agentId: number): Promise<AgentProfile | null>;
  /** null = unknown agent (route turns it into 404). */
  getAttestations(agentId: number, page: number, limit: number): Promise<Page<Attestation> | null>;
  getRisk(agentId: number): Promise<RiskReport | null>;
  /**
   * Resolve an address (lowercased) to an agent — used by the MetaMask Snap
   * to identify transactions sent to an agent owner or the agent's vault.
   * null = no agent is associated with the address.
   */
  findByAddress(address: string): Promise<AgentSummary | null>;
}

/**
 * ACTIVE DATA SOURCE: mock (fictional, quarantined — docs/06).
 * TODO(Envio): swap for the Envio GraphQL-backed repository here
 * (single selection point; `DATA_SOURCE` env switch deferred until then).
 */
export const agentRepository: AgentRepository = createMockAgentRepository();
