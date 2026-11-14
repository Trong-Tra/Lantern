import type { ApiResponse, ApiErrorResponse } from "@lantern/types";

/**
 * Truncates a blockchain or agent address for display (e.g. 0x1234...5678).
 */
export function formatAddress(address: string, digits = 4): string {
  if (!address || address.length <= digits * 2 + 3) {
    return address || "";
  }
  return `${address.slice(0, digits + 2)}...${address.slice(-digits)}`;
}

/**
 * Promisified delay helper.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Helper to construct a standardized successful API response envelope.
 */
export function createApiResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
}

/**
 * Helper to construct a standardized error API response envelope.
 */
export function createApiErrorResponse(message: string, code?: string): ApiErrorResponse {
  return {
    success: false,
    message,
    ...(code ? { code } : {}),
  };
}

/**
 * Combines a base URL and endpoint path, normalizing redundant slashes.
 */
export function buildApiUrl(path: string, baseUrl = "http://localhost:4000"): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}
