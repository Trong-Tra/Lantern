/**
 * LLM chat brains for ERC-8004 agent identities via OpenRouter.
 *
 * - The API key NEVER leaves this server (never sent to the browser, never logged).
 * - Config comes from env: OPENROUTER_API_KEY (required), CHAT_MODEL (default
 *   "openrouter/free" — the owner's free-tier router, see .env.example).
 * - Everything is injectable (fetcher/config) so tests never hit the network.
 */
import type { AgentProfile, ChatMessage } from "@lantern/types";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_CHAT_MODEL = "openrouter/free";

/** Missing/invalid local configuration — route maps this to 503. */
export class ChatConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatConfigError";
  }
}

export interface ChatService {
  /** Returns the agent's reply. Throws ChatConfigError (503) or Error (502). */
  complete(profile: AgentProfile, message: string, history: ChatMessage[]): Promise<string>;
}

/** Minimal fetch shape so tests can inject fakes without DOM/undici types. */
export type ChatFetcher = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface ChatServiceConfig {
  apiKey?: string | undefined;
  model?: string | undefined;
  baseUrl?: string | undefined;
  fetcher?: ChatFetcher;
  timeoutMs?: number;
}

/**
 * Builds the system prompt from the agent's on-record profile.
 * Pure — unit-tested. Must never instruct the model to invent on-chain facts.
 */
export function buildSystemPrompt(profile: AgentProfile): string {
  const lines = [
    `You are "${profile.name}", an autonomous agent with ERC-8004 identity #${profile.agentId} on Monad.`,
    profile.bio ? `Persona: ${profile.bio}` : "Persona: demo agent persona.",
    `On-record stats: ${profile.executions} executions, ${profile.failures} failures, risk ${profile.risk}.`,
    "Speak in first person as this agent. Be concise (max ~120 words).",
    "You are a demo persona backed by quarantined mock profile data — say so if asked about your data source, and never invent transaction hashes, addresses, or live chain data.",
  ];
  return lines.join("\n");
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const msg = value as { role?: unknown; content?: unknown };
  return (
    (msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string" &&
    msg.content.length > 0
  );
}

interface OpenRouterChoice {
  message?: { content?: unknown };
}

function extractReply(body: unknown): string {
  const choices = (body as { choices?: OpenRouterChoice[] } | null)?.choices;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("OpenRouter response missing content");
  }
  return content;
}

/**
 * Free-tier routing (`openrouter/free`) picks a different model per call and
 * occasionally returns an empty message — one bounded retry covers the flake.
 */
const MAX_ATTEMPTS = 2;

export function createOpenRouterChatService(config: ChatServiceConfig = {}): ChatService {
  const fetcher: ChatFetcher = config.fetcher ?? ((url, init) => fetch(url, init));

  return {
    async complete(profile, message, history) {
      const apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new ChatConfigError("OPENROUTER_API_KEY is not set");
      }
      const model = config.model ?? process.env.CHAT_MODEL ?? DEFAULT_CHAT_MODEL;
      const baseUrl = (config.baseUrl ?? OPENROUTER_DEFAULT_BASE_URL).replace(/\/+$/, "");
      const timeoutMs = config.timeoutMs ?? 15_000;

      // Server-side cap: last 10 prior turns, validated shapes only.
      const safeHistory = history.filter(isChatMessage).slice(-10);

      const body = {
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(profile) },
          ...safeHistory,
          { role: "user", content: message },
        ],
        max_tokens: 300,
      };

      let lastError = new Error("chat failed");
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          let response: Awaited<ReturnType<ChatFetcher>>;
          try {
            response = await fetcher(`${baseUrl}/chat/completions`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
              signal: AbortSignal.timeout(timeoutMs),
            });
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            throw new Error(`OpenRouter unreachable: ${reason}`);
          }

          if (!response.ok) {
            throw new Error(`OpenRouter HTTP ${response.status}`);
          }

          return extractReply(await response.json());
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt === MAX_ATTEMPTS) break;
        }
      }
      throw lastError;
    },
  };
}
