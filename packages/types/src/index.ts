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

/** Risk classification for an agent (derived off-chain; formula TBD — docs/03). */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

/** On-chain action categories minted as ERC-5192 attestations (docs/02). */
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
  /** Unix seconds (block timestamp). */
  timestamp: number;
}

export interface AgentSummary {
  agentId: number;
  name: string;
  /** Absent until the passport is minted (1:1 with agentId, docs/02). */
  passportTokenId?: number;
  owner: string;
  /** Score formula TBD — absent until scoring lands; UI falls back to N/A. */
  score?: number;
  risk: RiskLevel;
  executions: number;
  failures: number;
  /** Unix seconds. */
  updatedAt: number;
}

export interface AgentProfile extends AgentSummary {
  identityUri: string;
  passportUri?: string;
  attestations: Attestation[];
  /** Demo persona blurb used by the chat endpoint (mock-only until live data). */
  bio?: string;
}

export interface RiskReport {
  agentId: number;
  /** Score formula TBD — omitted until scoring lands. */
  score?: number;
  risk: RiskLevel;
  reasons: string[];
}

/** One turn of agent chat (assistant = the agent's LLM persona). */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Request body for POST /api/agents/:id/chat. */
export interface ChatRequest {
  message: string;
  /** Prior turns, oldest first. Server caps what it keeps. */
  history?: ChatMessage[];
}

/** Successful chat response data. */
export interface ChatReply {
  reply: string;
}
