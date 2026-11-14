import { Router } from "express";
import type { AgentSummary, PaginatedResponse } from "@lantern/types";
import { createApiErrorResponse, createApiResponse } from "@lantern/utils";
import { agentRepository, type AgentRepository } from "../repositories/agentRepository.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface AgentsRouterDeps {
  repository: AgentRepository;
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

export function createAgentsRouter({ repository }: AgentsRouterDeps): Router {
  const agentsRouter = Router();

  /** GET /api/agents — paginated agent summaries. */
  agentsRouter.get("/", async (req, res) => {
    const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(toPositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);

    const { items, total } = await repository.listAgents(page, limit);
    res.json(paginated<AgentSummary>(items, total, page, limit));
  });

  /** GET /api/agents/:id — full agent profile. */
  agentsRouter.get("/:id", async (req, res) => {
    const agentId = parseAgentId(req.params.id);
    if (agentId === null) {
      res.status(400).json(createApiErrorResponse("Invalid agent id", "INVALID_AGENT_ID"));
      return;
    }

    const profile = await repository.getAgent(agentId);
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

    const result = await repository.getAttestations(agentId, page, limit);
    if (!result) {
      res.status(404).json(createApiErrorResponse("Agent not found", "NOT_FOUND"));
      return;
    }

    res.json(paginated(result.items, result.total, page, limit));
  });

  return agentsRouter;
}

/** Default router wired to the live indexer-backed repository. */
export const agentsRouter: Router = createAgentsRouter({ repository: agentRepository });
