/**
 * API integration tests: spins the app on port 0, fetches, asserts envelopes.
 * Run: pnpm --filter @lantern/api test
 */
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import type {
  AgentProfile,
  AgentSummary,
  Attestation,
  ChatMessage,
  PaginatedResponse,
  RiskReport,
} from "@lantern/types";
import { createApp, type AppOptions } from "./app.js";
import {
  createOpenRouterChatService,
  type ChatFetcher,
} from "./services/openRouterChat.js";

async function startApp(options: AppOptions = {}): Promise<{
  base: string;
  close: () => void;
}> {
  const server: Server = createApp(options).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return { base: `http://127.0.0.1:${port}`, close: () => server.close() };
}

describe("api", () => {
  let base: string;
  let close: () => void;

  before(async () => {
    ({ base, close } = await startApp());
  });

  after(() => {
    close();
  });

  it("GET / returns the health envelope", async () => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      success: true,
      data: { status: "ok" },
      message: "API is running",
    });
  });

  it("GET /api/hello returns the greeting envelope", async () => {
    const res = await fetch(`${base}/api/hello`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.greeting, "Hello from Node.js API");
  });

  it("GET /api/agents returns a paginated envelope of summaries", async () => {
    const res = await fetch(`${base}/api/agents`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as PaginatedResponse<AgentSummary>;

    assert.equal(body.success, true);
    assert.equal(body.total, 3);
    assert.equal(body.page, 1);
    assert.equal(body.limit, 20);
    assert.equal(body.totalPages, 1);
    assert.equal(body.data.length, 3);

    // Summaries must not leak profile-only fields.
    for (const summary of body.data) {
      assert.ok(Number.isInteger(summary.agentId));
      assert.ok(typeof summary.name === "string");
      assert.equal("identityUri" in summary, false);
      assert.equal("attestations" in summary, false);
      // Score formula is TBD — absent so the UI renders N/A.
      assert.equal(summary.score, undefined);
    }
  });

  it("GET /api/agents paginates with page/limit", async () => {
    const res = await fetch(`${base}/api/agents?page=2&limit=2`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as PaginatedResponse<AgentSummary>;

    assert.equal(body.page, 2);
    assert.equal(body.limit, 2);
    assert.equal(body.total, 3);
    assert.equal(body.totalPages, 2);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].agentId, 3);
  });

  it("GET /api/agents/:id returns the full profile", async () => {
    const res = await fetch(`${base}/api/agents/1`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: AgentProfile };

    assert.equal(body.success, true);
    assert.equal(body.data.agentId, 1);
    assert.equal(body.data.identityUri, "ipfs://mock-agent-1");
    assert.equal(body.data.passportTokenId, 1);
    assert.ok(Array.isArray(body.data.attestations));
    assert.ok(body.data.attestations.length > 0);
  });

  it("GET /api/agents/:id works for an agent without a passport", async () => {
    const res = await fetch(`${base}/api/agents/3`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: AgentProfile };

    assert.equal(body.data.agentId, 3);
    assert.equal(body.data.passportTokenId, undefined);
    assert.equal(body.data.passportUri, undefined);
    assert.equal(body.data.risk, "UNKNOWN");
  });

  it("GET /api/agents/:id → 404 for unknown agent", async () => {
    const res = await fetch(`${base}/api/agents/999`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), {
      success: false,
      message: "Agent not found",
      code: "NOT_FOUND",
    });
  });

  it("GET /api/agents/:id → 400 for malformed id", async () => {
    const res = await fetch(`${base}/api/agents/not-a-number`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "INVALID_AGENT_ID");
  });

  it("GET /api/agents/:id/attestations returns newest first", async () => {
    const res = await fetch(`${base}/api/agents/1/attestations`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as PaginatedResponse<Attestation>;

    assert.equal(body.success, true);
    assert.equal(body.total, 3);
    assert.equal(body.data.length, 3);

    const timestamps = body.data.map((a) => a.timestamp);
    assert.deepEqual(timestamps, [...timestamps].sort((a, b) => b - a));
    for (const att of body.data) {
      assert.equal(att.agentId, 1);
    }
  });

  it("GET /api/agents/:id/attestations paginates", async () => {
    const res = await fetch(`${base}/api/agents/1/attestations?page=1&limit=2`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as PaginatedResponse<Attestation>;

    assert.equal(body.total, 3);
    assert.equal(body.totalPages, 2);
    assert.equal(body.data.length, 2);
  });

  it("GET /api/agents/:id/attestations → empty list for agent without attestations", async () => {
    const res = await fetch(`${base}/api/agents/3/attestations`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as PaginatedResponse<Attestation>;

    assert.equal(body.success, true);
    assert.equal(body.total, 0);
    assert.deepEqual(body.data, []);
  });

  it("GET /api/agents/:id/attestations → 404 for unknown agent", async () => {
    const res = await fetch(`${base}/api/agents/999/attestations`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "NOT_FOUND");
  });

  it("GET /api/agents/:id/risk returns a risk report", async () => {
    const res = await fetch(`${base}/api/agents/1/risk`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; data: RiskReport };

    assert.equal(body.success, true);
    assert.equal(body.data.agentId, 1);
    assert.equal(body.data.risk, "LOW");
    assert.ok(Array.isArray(body.data.reasons));
    assert.ok(body.data.reasons.length > 0);
    // Score formula TBD — never invented by the API.
    assert.equal(body.data.score, undefined);
  });

  it("GET /api/agents/:id/risk → 404 for unknown agent", async () => {
    const res = await fetch(`${base}/api/agents/999/risk`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "NOT_FOUND");
  });

  it("unknown route → 404 envelope", async () => {
    const res = await fetch(`${base}/api/definitely-not-a-route`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "NOT_FOUND");
  });
});

describe("lookup endpoint", () => {
  let base: string;
  let close: () => void;

  before(async () => {
    ({ base, close } = await startApp());
  });

  after(() => {
    delete process.env.AGENT_VAULT_ADDRESS;
    delete process.env.AGENT_VAULT_AGENT_ID;
    close();
  });

  it("GET /api/agents/lookup/:address matches an agent owner (case-insensitive)", async () => {
    const res = await fetch(`${base}/api/agents/lookup/0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.agentId, 1);
    assert.equal(body.data.owner, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  });

  it("GET /api/agents/lookup/:address returns null for an unknown address", async () => {
    const res = await fetch(`${base}/api/agents/lookup/0x1111111111111111111111111111111111111111`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data, null);
  });

  it("GET /api/agents/lookup/:address → 400 for malformed address", async () => {
    const res = await fetch(`${base}/api/agents/lookup/not-an-address`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "INVALID_ADDRESS");
  });

  it("GET /api/agents/lookup/:address resolves the demo vault via env mapping", async () => {
    process.env.AGENT_VAULT_ADDRESS = "0x9999999999999999999999999999999999999999";
    const res = await fetch(`${base}/api/agents/lookup/0x9999999999999999999999999999999999999999`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.agentId, 1);

    process.env.AGENT_VAULT_AGENT_ID = "2";
    const res2 = await fetch(`${base}/api/agents/lookup/0x9999999999999999999999999999999999999999`);
    const body2 = await res2.json();
    assert.equal(body2.data.agentId, 2);
    delete process.env.AGENT_VAULT_AGENT_ID;
  });
});

describe("chat endpoint", () => {
  it("POST /api/agents/:id/chat returns the persona reply via the injected service", async () => {
    const seen: { agentId?: number; message?: string; history?: ChatMessage[] } = {};
    const { base, close } = await startApp({
      chatService: {
        async complete(profile, message, history) {
          seen.agentId = profile.agentId;
          seen.message = message;
          seen.history = history;
          return "gm, keeper here";
        },
      },
    });

    try {
      const res = await fetch(`${base}/api/agents/1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "  how is your streak?  ",
          history: [{ role: "user", content: "hi" }, { role: "assistant", content: "hey" }],
        }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { success: boolean; data: { reply: string } };
      assert.equal(body.success, true);
      assert.equal(body.data.reply, "gm, keeper here");

      assert.equal(seen.agentId, 1);
      assert.equal(seen.message, "how is your streak?");
      assert.equal(seen.history?.length, 2);
    } finally {
      close();
    }
  });

  it("POST /api/agents/:id/chat → 400 for malformed id / empty / oversized message", async () => {
    const { base, close } = await startApp({ chatService: { complete: async () => "never" } });
    const post = (path: string, payload: unknown) =>
      fetch(`${base}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

    try {
      const badId = await post("/api/agents/abc/chat", { message: "hi" });
      assert.equal(badId.status, 400);
      assert.equal(((await badId.json()) as { code: string }).code, "INVALID_AGENT_ID");

      const empty = await post("/api/agents/1/chat", { message: "   " });
      assert.equal(empty.status, 400);
      assert.equal(((await empty.json()) as { code: string }).code, "INVALID_MESSAGE");

      const oversized = await post("/api/agents/1/chat", { message: "x".repeat(2001) });
      assert.equal(oversized.status, 400);
      assert.equal(((await oversized.json()) as { code: string }).code, "INVALID_MESSAGE");
    } finally {
      close();
    }
  });

  it("POST /api/agents/:id/chat → 404 for unknown agent", async () => {
    const { base, close } = await startApp({ chatService: { complete: async () => "never" } });
    try {
      const res = await fetch(`${base}/api/agents/999/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hi" }),
      });
      assert.equal(res.status, 404);
      assert.equal(((await res.json()) as { code: string }).code, "NOT_FOUND");
    } finally {
      close();
    }
  });

  it("POST /api/agents/:id/chat → 503 when OpenRouter is not configured", async () => {
    const { base, close } = await startApp({
      chatService: createOpenRouterChatService({ apiKey: "" }),
    });
    try {
      const res = await fetch(`${base}/api/agents/1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hi" }),
      });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { code: string; message: string };
      assert.equal(body.code, "OPENROUTER_NOT_CONFIGURED");
      assert.match(body.message, /OPENROUTER_API_KEY/);
    } finally {
      close();
    }
  });

  it("POST /api/agents/:id/chat → 502 when the provider fails", async () => {
    const failingFetcher: ChatFetcher = async () => ({
      ok: false,
      status: 429,
      json: async () => ({}),
    });
    const { base, close } = await startApp({
      chatService: createOpenRouterChatService({ apiKey: "test-key", fetcher: failingFetcher }),
    });
    try {
      const res = await fetch(`${base}/api/agents/1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hi" }),
      });
      assert.equal(res.status, 502);
      assert.equal(((await res.json()) as { code: string }).code, "CHAT_UPSTREAM_ERROR");
    } finally {
      close();
    }
  });
});
