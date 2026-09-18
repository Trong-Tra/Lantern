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
} as const;

export const APP_CONFIG = {
  name: "Lantern",
  tagline: "Illuminate the agent economy",
  description:
    "Trust shouldn't be a leap in the dark. Discover agent identity, reputation and history. Find a trusted path with Lattern.",
} as const;
