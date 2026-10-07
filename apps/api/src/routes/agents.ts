import { Router } from "express";
import type { ChatMessage, AgentSummary, PaginatedResponse } from "@lantern/types";
import { createApiErrorResponse, createApiResponse } from "@lantern/utils";
import { agentRepository } from "../repositories/agentRepository.js";
import {
  ChatConfigError,
  createOpenRouterChatService,
  type ChatService,
} from "../services/openRouterChat.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_MESSAGE_CHARS = 2000;

export interface AgentsRouterDeps {
  chat: ChatService;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Returns null for anything that isn't a valid agent id (ids start at 1). */
function parseAgentId(raw: unknown): number | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function paginated<T>(items: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
  return {
    ...createApiResponse(items),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function createAgentsRouter({ chat }: AgentsRouterDeps): Router {
  const agentsRouter = Router();

  /** GET /api/agents — paginated agent summaries. */
  agentsRouter.get("/", async (req, res) => {
    const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);

    const { items, total } = await agentRepository.listAgents(page, limit);
    res.json(paginated<AgentSummary>(items, total, page, limit));
  });

  /** GET /api/agents/:id — full agent profile. */
  agentsRouter.get("/:id", async (req, res) => {
    const agentId = parseAgentId(req.params.id);
    if (agentId === null) {
      res.status(400).json(createApiErrorResponse("Invalid agent id", "INVALID_AGENT_ID"));
      return;
    }

    const profile = await agentRepository.getAgent(agentId);
    if (!profile) {
      res.status(404).json(createApiErrorResponse("Agent not found", "NOT_FOUND"));
      return;
    }

    res.json(createApiResponse(profile));
  });

  /** GET /api/agents/:id/attestations — 5192 mints, newest first. */
  agentsRouter.get("/:id/attestations", async (req, res) => {
    const agentId = parseAgentId(req.params.id);
    if (agentId === null) {
      res.status(400).json(createApiErrorResponse("Invalid agent id", "INVALID_AGENT_ID"));
      return;
    }

    const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);

    const result = await agentRepository.getAttestations(agentId, page, limit);
    if (!result) {
      res.status(404).json(createApiErrorResponse("Agent not found", "NOT_FOUND"));
      return;
    }

    res.json(paginated(result.items, result.total, page, limit));
  });

  /** GET /api/agents/:id/risk — Snap-facing risk report. */
  agentsRouter.get("/:id/risk", async (req, res) => {
    const agentId = parseAgentId(req.params.id);
    if (agentId === null) {
      res.status(400).json(createApiErrorResponse("Invalid agent id", "INVALID_AGENT_ID"));
      return;
    }

    const report = await agentRepository.getRisk(agentId);
    if (!report) {
      res.status(404).json(createApiErrorResponse("Agent not found", "NOT_FOUND"));
      return;
    }

    res.json(createApiResponse(report));
  });

  /** POST /api/agents/:id/chat — one turn with the agent's LLM persona (key stays server-side). */
  agentsRouter.post("/:id/chat", async (req, res) => {
    const agentId = parseAgentId(req.params.id);
    if (agentId === null) {
      res.status(400).json(createApiErrorResponse("Invalid agent id", "INVALID_AGENT_ID"));
      return;
    }

    const body = (req.body ?? {}) as { message?: unknown; history?: unknown };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > MAX_MESSAGE_CHARS) {
      res
        .status(400)
        .json(createApiErrorResponse(`message required (1-${MAX_MESSAGE_CHARS} chars)`, "INVALID_MESSAGE"));
      return;
    }

    const profile = await agentRepository.getAgent(agentId);
    if (!profile) {
      res.status(404).json(createApiErrorResponse("Agent not found", "NOT_FOUND"));
      return;
    }

    const history: ChatMessage[] = Array.isArray(body.history) ? (body.history as ChatMessage[]) : [];

    try {
      const reply = await chat.complete(profile, message, history);
      res.json(createApiResponse({ reply }));
    } catch (err) {
      if (err instanceof ChatConfigError) {
        res.status(503).json(createApiErrorResponse(err.message, "OPENROUTER_NOT_CONFIGURED"));
        return;
      }
      console.error("[api] chat upstream error:", err);
      res.status(502).json(createApiErrorResponse("Chat provider request failed", "CHAT_UPSTREAM_ERROR"));
    }
  });

  return agentsRouter;
}

/** Default router wired to the real OpenRouter-backed service. */
export const agentsRouter: Router = createAgentsRouter({ chat: createOpenRouterChatService() });
