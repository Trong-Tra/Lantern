/**
 * API integration tests: spins the app on port 0, fetches, asserts envelopes.
 * Run: pnpm --filter @lantern/api test
 */
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import type { AgentProfile, AgentSummary, Attestation, PaginatedResponse, RiskReport } from "@lantern/types";
import { createApp } from "./app.js";

describe("api", () => {
  let server: Server;
  let base: string;

  before(async () => {
    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
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
