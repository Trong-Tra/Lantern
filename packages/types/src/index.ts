export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** On-chain action categories minted as ERC-5192 attestations (docs/contracts.md). Mirrors Reputation.sol. */
export type AttestationActionType = "STAKE" | "UNSTAKE" | "HARVEST" | "SWAP";

export type AttestationResult = "SUCCESS" | "FAIL";

export interface Attestation {
  tokenId: number;
  agentId: number;
  actionType: AttestationActionType;
  result: AttestationResult;
  protocol?: string;
  /** Raw uint256 as decimal string — never lose precision. */
  amount?: string;
  uri?: string;
  /** Mint transaction hash — present for indexer-sourced records (envio). */
  txHash?: string;
  /** Unix seconds (block timestamp). */
  timestamp: number;
}

/**
 * A registered solver agent: ERC-8004 identity + the raw counts of its
 * soulbound attestation record. No derived score/risk — in the arena,
 * standing is earned by winning route competitions, not claimed by a formula.
 */
export interface AgentSummary {
  agentId: number;
  name: string;
  owner: string;
  executions: number;
  failures: number;
  /** Unix seconds. */
  updatedAt: number;
}

export interface AgentProfile extends AgentSummary {
  identityUri: string;
  attestations: Attestation[];
}
