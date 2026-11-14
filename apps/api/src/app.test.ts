/**
 * API integration tests: spins the app on port 0 with a fake repository,
 * fetches, asserts envelopes. Run: pnpm --filter @lantern/api test
 */
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import type { AgentProfile, AgentSummary, Attestation, PaginatedResponse } from "@lantern/types";
import { createApp, type AppOptions } from "./app.js";
import type { AgentRepository } from "./repositories/agentRepository.js";

const SUMMARIES: AgentSummary[] = [
  {
    agentId: 1,
    name: "Route Runner",
    owner: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    executions: 128,
    failures: 4,
    updatedAt: 1_790_856_000,
  },
  {
    agentId: 2,
    name: "Hop Surgeon",
    owner: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    executions: 57,
    failures: 12,
    updatedAt: 1_790_812_800,
  },
  {
    agentId: 3,
    name: "Fresh Solver",
    owner: "0xcccccccccccccccccccccccccccccccccccccccc",
    executions: 0,
    failures: 0,
    updatedAt: 1_790_769_600,
  },
];

const ATTESTATIONS: Attestation[] = [
  {
    tokenId: 3,
    agentId: 1,
    actionType: "SWAP",
    result: "SUCCESS",
    protocol: "demo://protocols/lantern-arena",
    amount: "12500000000000000000",
    uri: "demo://attestations/a1-3",
    timestamp: 1_790_856_000,
  },
  {
    tokenId: 2,
    agentId: 1,
    actionType: "SWAP",
    result: "FAIL",
    protocol: "demo://protocols/lantern-arena",
    amount: "4200000000000000000",
    uri: "demo://attestations/a1-2",
    timestamp: 1_790_812_800,
  },
  {
    tokenId: 1,
    agentId: 1,
    actionType: "SWAP",
    result: "SUCCESS",
    protocol: "demo://protocols/lantern-arena",
    amount: "100000000000000000000",
    uri: "demo://attestations/a1-1",
    timestamp: 1_790_769_600,
  },
];

/** In-memory fake — deterministic, zero network. */
function createFakeRepository(): AgentRepository {
  return {
    async listAgents(page, limit) {
      const start = (page - 1) * limit;
      return { items: SUMMARIES.slice(start, start + limit), total: SUMMARIES.length };
    },
    async getAgent(agentId) {
      const summary = SUMMARIES.find((s) => s.agentId === agentId);
      if (!summary) return null;
      const profile: AgentProfile = {
        ...summary,
        identityUri: `demo://lantern/agent-${agentId}`,
        attestations: ATTESTATIONS.filter((a) => a.agentId === agentId),
      };
      return profile;
    },
    async getAttestations(agentId, page, limit) {
      const summary = SUMMARIES.find((s) => s.agentId === agentId);
      if (!summary) return null;
      const all = ATTESTATIONS.filter((a) => a.agentId === agentId);
      const start = (page - 1) * limit;
      return { items: all.slice(start, start + limit), total: all.length };
    },
  };
}

async function startApp(options: AppOptions = {}): Promise<{
  base: string;
  close: () => void;
}> {
  const server: Server = createApp({ repository: createFakeRepository(), ...options }).listen(0);
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
    assert.equal(body.data.identityUri, "demo://lantern/agent-1");
    assert.equal(body.data.executions, 128);
    assert.equal(body.data.failures, 4);
    assert.ok(Array.isArray(body.data.attestations));
    assert.ok(body.data.attestations.length > 0);
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

  it("unknown route → 404 envelope", async () => {
    const res = await fetch(`${base}/api/definitely-not-a-route`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, "NOT_FOUND");
  });
});
