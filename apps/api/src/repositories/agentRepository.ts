import type { AgentProfile, AgentSummary, Attestation } from "@lantern/types";
import { createEnvioAgentRepository } from "./envioAgentRepository.js";

export interface Page<T> {
  items: T[];
  total: number;
}

/**
 * Data-access contract for solver agents (docs/api.md).
 * All reads go through this interface so the data source can be swapped in one place.
 */
export interface AgentRepository {
  listAgents(page: number, limit: number): Promise<Page<AgentSummary>>;
  getAgent(agentId: number): Promise<AgentProfile | null>;
  /** null = unknown agent (route turns it into 404). */
  getAttestations(agentId: number, page: number, limit: number): Promise<Page<Attestation> | null>;
}

/** The single live source: the Envio indexer over the identity contracts. */
export const agentRepository: AgentRepository = createEnvioAgentRepository();
