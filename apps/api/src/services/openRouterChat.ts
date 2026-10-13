/**
 * LLM chat brains for ERC-8004 agent identities via OpenRouter.
 *
 * - The API key NEVER leaves this server (never sent to the browser, never logged).
 * - Config comes from env: OPENROUTER_API_KEY (required), CHAT_MODEL (primary),
 *   CHAT_MODEL_FALLBACKS (comma-separated chain). Free-tier models rate-limit
 *   fast, so the service walks the chain: per-model bounded retry for the
 *   empty-content flake, then the next model on rate limits / overload /
 *   unknown-model / timeouts. Auth and shape failures abort immediately.
 * - Everything is injectable (fetcher/config) so tests never hit the network.
 */
import type { AgentProfile, ChatMessage } from "@lantern/types";

export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_CHAT_MODEL = "openrouter/free";
/**
 * Free-tier fallback models (env-overridable via CHAT_MODEL_FALLBACKS).
 * Model availability shifts on OpenRouter — treat these as defaults, not
 * contracts; the chain just skips models that error or vanish.
 */
export const DEFAULT_CHAT_MODEL_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
];

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
  /** Single model — only used when `models` is not given. */
  model?: string | undefined;
  /** Full model chain, most-preferred first. Overrides `model`. */
  models?: string[] | undefined;
  baseUrl?: string | undefined;
  fetcher?: ChatFetcher;
  timeoutMs?: number;
}

/** Env chain: CHAT_MODEL primary + CHAT_MODEL_FALLBACKS (comma-separated). */
export function resolveChatModels(): string[] {
  const primary = process.env.CHAT_MODEL ?? DEFAULT_CHAT_MODEL;
  const raw = process.env.CHAT_MODEL_FALLBACKS;
  const fallbacks = (
    raw === undefined ? DEFAULT_CHAT_MODEL_FALLBACKS : raw.split(",")
  )
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [primary, ...fallbacks.filter((model) => model !== primary)];
}

/** Auth/shape failures — no other model can fix these; abort the chain. */
class FatalChatError extends Error {}

/** Rate limits, overload, unknown model id, timeouts — the next model may do better. */
function isRetryableStatus(status: number): boolean {
  return status === 404 || status === 408 || status === 409 || status === 429 || status >= 500;
}

/**
 * Builds the system prompt from the agent's on-record profile.
 * Pure — unit-tested. Must never instruct the model to invent on-chain facts.
 */
export function buildSystemPrompt(profile: AgentProfile): string {
  // Honesty by construction (docs/06): the quarantined mock is the only
  // source whose identity URIs are ipfs://mock-*; indexer-sourced profiles
  // carry live testnet records (demo:// identities).
  const isMock = profile.identityUri.startsWith("ipfs://mock-");
  const dataSourceLine = isMock
    ? "You are a demo persona backed by quarantined mock profile data — say so if asked about your data source, and never invent transaction hashes, addresses, or live chain data."
    : "Your identity and history are live on-chain records from the Monad testnet indexer — say so if asked, and never invent transaction hashes, addresses, or chain data.";
  const lines = [
    `You are "${profile.name}", an autonomous agent with ERC-8004 identity #${profile.agentId} on Monad.`,
    profile.bio ? `Persona: ${profile.bio}` : "Persona: demo agent persona.",
    `On-record stats: ${profile.executions} executions, ${profile.failures} failures, risk ${profile.risk}.`,
    "Speak in first person as this agent. Be concise (max ~120 words).",
    dataSourceLine,
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
      const models =
        config.models ?? (config.model !== undefined ? [config.model] : resolveChatModels());
      const baseUrl = (config.baseUrl ?? OPENROUTER_DEFAULT_BASE_URL).replace(/\/+$/, "");
      const timeoutMs = config.timeoutMs ?? 15_000;

      // Server-side cap: last 10 prior turns, validated shapes only.
      const safeHistory = history.filter(isChatMessage).slice(-10);

      const body = {
        messages: [
          { role: "system", content: buildSystemPrompt(profile) },
          ...safeHistory,
          { role: "user", content: message },
        ],
        max_tokens: 300,
      };

      const modelErrors: string[] = [];
      for (const model of models) {
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
                body: JSON.stringify({ model, ...body }),
                signal: AbortSignal.timeout(timeoutMs),
              });
            } catch (err) {
              const reason = err instanceof Error ? err.message : String(err);
              throw new Error(`OpenRouter unreachable: ${reason}`);
            }

            if (!response.ok) {
              lastError = new Error(`OpenRouter HTTP ${response.status}`);
              if (!isRetryableStatus(response.status)) {
                throw new FatalChatError(lastError.message);
              }
              // Rate-limited/overloaded: retrying the same model in milliseconds
              // cannot help — the next model IS the retry.
              break;
            }

            return extractReply(await response.json());
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (err instanceof FatalChatError) throw err;
            if (attempt === MAX_ATTEMPTS) break;
          }
        }
        modelErrors.push(`${model}: ${lastError.message}`);
      }
      throw new Error(`all ${models.length} chat model(s) failed — ${modelErrors.join(" | ")}`);
    },
  };
}
