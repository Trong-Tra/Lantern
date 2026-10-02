import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { API_ENDPOINTS } from "@lantern/config";
import { createApiErrorResponse, createApiResponse } from "@lantern/utils";
import { agentsRouter } from "./routes/agents.js";

/**
 * Builds the Express app without listening, so tests can spin it on port 0.
 * `index.ts` owns the listen call.
 */
export function createApp(): express.Express {
  const app = express();

  // TODO(docs/03): make the allowlist env-driven before leaving localhost.
  app.use(cors({ origin: "http://localhost:3000" }));
  app.use(express.json());

  app.get(API_ENDPOINTS.HEALTH, (_req, res) => {
    res.json(createApiResponse({ status: "ok" }, "API is running"));
  });

  app.get(API_ENDPOINTS.HELLO, (_req, res) => {
    res.json(createApiResponse({ greeting: "Hello from Node.js API" }));
  });

  app.use(API_ENDPOINTS.AGENTS, agentsRouter);

  // 404 in the standard error envelope (must come after all routers).
  app.use((req, res) => {
    res.status(404).json(createApiErrorResponse(`Route not found: ${req.method} ${req.path}`, "NOT_FOUND"));
  });

  // Central error handler — keeps failures in the envelope, never a stack trace.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api] unhandled error:", err);
    res.status(500).json(createApiErrorResponse(message, "INTERNAL_ERROR"));
  };
  app.use(errorHandler);

  return app;
}
