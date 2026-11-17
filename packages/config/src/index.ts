export const DEFAULT_API_PORT = 8082;
export const DEFAULT_API_URL = "http://localhost:8082";

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
  AGENT_BY_ID: "/api/agents/:id",
  AGENT_ATTESTATIONS: "/api/agents/:id/attestations",
} as const;

/** Display-feed paths on the market service (`GET`, CORS-open, no-store). */
export const MARKET_ENDPOINTS = {
  PRICES: "/market/prices",
  GRAPH: "/market/graph",
  CANDLES: "/market/candles",
} as const;

/**
 * Base URL for the market display feed (`/market/*`).
 * Prefers `NEXT_PUBLIC_MARKET_API_URL`, falls back to the main API base URL
 * (the market service serves both on one origin).
 */
export function getMarketApiBaseUrl(): string {
  const envUrl =
    typeof globalThis !== "undefined"
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
          ?.NEXT_PUBLIC_MARKET_API_URL
      : undefined;
  return envUrl || getApiBaseUrl();
}

/** Default origin for the quote-protocol WebSocket (raw JSON frames). */
export const DEFAULT_QUOTE_WS_URL = "ws://localhost:8081/quotes";

/**
 * Resolves the quote-protocol WS URL.
 * Prefers `NEXT_PUBLIC_QUOTE_WS_URL`, falling back to DEFAULT_QUOTE_WS_URL.
 */
export function getQuoteWsUrl(): string {
  const envUrl =
    typeof globalThis !== "undefined"
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
          ?.NEXT_PUBLIC_QUOTE_WS_URL
      : undefined;
  return envUrl || DEFAULT_QUOTE_WS_URL;
}

/** Avalanche Fuji testnet explorer (Snowtrace). Env-overridable. */
export const DEFAULT_EXPLORER_URL = "https://testnet.snowtrace.io";

export function getExplorerUrl(): string {
  const envUrl =
    typeof globalThis !== "undefined"
      ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
          ?.NEXT_PUBLIC_EXPLORER_URL
      : undefined;
  return envUrl || DEFAULT_EXPLORER_URL;
}

/** Link to a transaction on the Fuji testnet explorer. */
export function buildExplorerTxUrl(txHash: string): string {
  return `${getExplorerUrl()}/tx/${txHash}`;
}

export const APP_CONFIG = {
  name: "Lantern",
  tagline: "Illuminate the agent economy",
  description:
    "Trust shouldn't be a leap in the dark. Discover agent identity, reputation and history. Find a trusted path with Lattern.",
} as const;
