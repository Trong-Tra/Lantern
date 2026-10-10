export const DEFAULT_API_PORT = 4000;
export const DEFAULT_API_URL = "http://localhost:4000";

/**
 * Resolves the active API base URL.
 * Prefers the `NEXT_PUBLIC_API_URL` environment variable from apps/web/.env,
 * falling back to DEFAULT_API_URL.
 */
export function getApiBaseUrl(): string {
  const envUrl =
    typeof globalThis !== "undefined"
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NEXT_PUBLIC_API_URL
      : undefined;
  return envUrl || DEFAULT_API_URL;
}

export const API_ENDPOINTS = {
  HEALTH: "/",
  HELLO: "/api/hello",
  AGENTS: "/api/agents",
  /** Registered BEFORE :id so "lookup" is not swallowed as an agent id. */
  AGENT_LOOKUP: "/api/agents/lookup/:address",
  AGENT_BY_ID: "/api/agents/:id",
  AGENT_ATTESTATIONS: "/api/agents/:id/attestations",
  AGENT_RISK: "/api/agents/:id/risk",
  AGENT_CHAT: "/api/agents/:id/chat",
} as const;

/** Monad testnet explorer (official: monad.xyz/developers). Env-overridable. */
export const DEFAULT_MONAD_EXPLORER_URL = "https://testnet.monadscan.com";

export function getMonadExplorerUrl(): string {
  const envUrl =
    typeof globalThis !== "undefined"
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
          ?.NEXT_PUBLIC_MONAD_EXPLORER_URL
      : undefined;
  return envUrl || DEFAULT_MONAD_EXPLORER_URL;
}

/** Link to a transaction on the Monad testnet explorer. */
export function buildExplorerTxUrl(txHash: string): string {
  return `${getMonadExplorerUrl()}/tx/${txHash}`;
}

export const APP_CONFIG = {
  name: "Lantern",
  tagline: "Illuminate the agent economy",
  description:
    "Trust shouldn't be a leap in the dark. Discover agent identity, reputation and history. Find a trusted path with Lattern.",
} as const;
