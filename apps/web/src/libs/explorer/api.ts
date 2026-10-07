/**
 * Explorer data layer — pure, package-free helpers around the API envelope so
 * the existing node:test loader can exercise them (see tests/explorer.test.mjs).
 * Components pass the global `fetch` (or a fake in tests) as `JsonFetcher`.
 */
import type {
  AgentProfile,
  AgentSummary,
  ChatMessage,
  ChatReply,
  PaginatedResponse,
  RiskReport,
} from "@lantern/types";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

/** Minimal fetch shape — global `fetch` satisfies it; tests inject fakes. */
export type JsonFetcher = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Appends query params, preserving any existing query string. */
export function withQuery(url: string, params: Record<string, string | number | undefined>): string {
  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  if (!search) return url;
  return url.includes("?") ? `${url}&${search}` : `${url}?${search}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function failure(status: number, body: unknown): ApiResult<never> {
  const message =
    isRecord(body) && typeof body.message === "string"
      ? body.message
      : `Request failed (HTTP ${status})`;
  return { ok: false, error: message, status };
}

async function request<T>(
  url: string,
  fetcher: JsonFetcher,
  extract: (body: unknown) => T | null,
  init?: Parameters<JsonFetcher>[1],
): Promise<ApiResult<T>> {
  let response: Awaited<ReturnType<JsonFetcher>>;
  try {
    response = await fetcher(url, init);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) return failure(response.status, body);

  const data = extract(body);
  if (data === null) {
    return { ok: false, error: "Malformed response envelope", status: response.status };
  }
  return { ok: true, data };
}

function envelopeData(body: unknown): unknown {
  return isRecord(body) && body.success === true ? body.data : undefined;
}

function extractPaginated<T>(body: unknown): PaginatedResponse<T> | null {
  if (!isRecord(body) || body.success !== true) return null;
  if (!Array.isArray(body.data)) return null;
  const counters = [body.total, body.page, body.limit, body.totalPages];
  if (!counters.every((value) => typeof value === "number")) return null;
  return {
    success: true,
    data: body.data as T[],
    total: body.total as number,
    page: body.page as number,
    limit: body.limit as number,
    totalPages: body.totalPages as number,
  };
}

export function fetchAgentsPage(
  url: string,
  fetcher: JsonFetcher,
): Promise<ApiResult<PaginatedResponse<AgentSummary>>> {
  return request(url, fetcher, (body) => extractPaginated<AgentSummary>(body));
}

export function fetchAgentProfile(url: string, fetcher: JsonFetcher): Promise<ApiResult<AgentProfile>> {
  return request(url, fetcher, (body) => {
    const data = envelopeData(body);
    if (!isRecord(data) || typeof data.agentId !== "number") return null;
    return data as unknown as AgentProfile;
  });
}

export function fetchRiskReport(url: string, fetcher: JsonFetcher): Promise<ApiResult<RiskReport>> {
  return request(url, fetcher, (body) => {
    const data = envelopeData(body);
    if (!isRecord(data) || typeof data.agentId !== "number" || typeof data.risk !== "string") {
      return null;
    }
    return data as unknown as RiskReport;
  });
}

export function postChat(
  url: string,
  message: string,
  history: ChatMessage[],
  fetcher: JsonFetcher,
): Promise<ApiResult<ChatReply>> {
  return request(
    url,
    fetcher,
    (body) => {
      const data = envelopeData(body);
      if (!isRecord(data) || typeof data.reply !== "string") return null;
      return { reply: data.reply };
    },
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    },
  );
}
