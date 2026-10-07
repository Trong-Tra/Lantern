import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSource } from "./helpers/load-source.mjs";

const api = loadSource("src/libs/explorer/api.ts");
const present = loadSource("src/libs/explorer/present.ts");

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return async () => ({ ok, status, json: async () => body });
}

const PAGE_ENVELOPE = {
  success: true,
  data: [{ agentId: 1, name: "A" }],
  total: 3,
  page: 2,
  limit: 12,
  totalPages: 1,
};

test("withQuery appends params and preserves an existing query", () => {
  assert.equal(api.withQuery("/api/agents", { page: 1, limit: 12 }), "/api/agents?page=1&limit=12");
  assert.equal(api.withQuery("/api/agents?page=1", { page: 2 }), "/api/agents?page=1&page=2");
  assert.equal(api.withQuery("/api/agents", { page: 1, missing: undefined }), "/api/agents?page=1");
  assert.equal(api.withQuery("/api/agents", {}), "/api/agents");
});

test("fetchAgentsPage unwraps a valid paginated envelope", async () => {
  const result = await api.fetchAgentsPage("/api/agents", jsonResponse(PAGE_ENVELOPE));
  assert.equal(result.ok, true);
  assert.equal(result.data.total, 3);
  assert.equal(result.data.page, 2);
  assert.equal(result.data.data[0].agentId, 1);
});

test("fetchAgentsPage surfaces error-envelope messages with status", async () => {
  const result = await api.fetchAgentsPage(
    "/api/agents",
    jsonResponse({ success: false, message: "Agent not found", code: "NOT_FOUND" }, { ok: false, status: 404 }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, "Agent not found");
  assert.equal(result.status, 404);
});

test("fetchAgentsPage fails on malformed payloads and network errors", async () => {
  const malformed = await api.fetchAgentsPage(
    "/api/agents",
    jsonResponse({ success: true, data: "nope" }),
  );
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error, "Malformed response envelope");

  const offline = await api.fetchAgentsPage("/api/agents", async () => {
    throw new Error("ECONNREFUSED");
  });
  assert.equal(offline.ok, false);
  assert.match(offline.error, /ECONNREFUSED/);
});

test("fetchAgentProfile requires agentId in the payload", async () => {
  const good = await api.fetchAgentProfile(
    "/api/agents/1",
    jsonResponse({ success: true, data: { agentId: 1, name: "Keeper" } }),
  );
  assert.equal(good.ok, true);
  assert.equal(good.data.agentId, 1);

  const bad = await api.fetchAgentProfile("/api/agents/1", jsonResponse({ success: true, data: {} }));
  assert.equal(bad.ok, false);
});

test("fetchRiskReport requires agentId and risk", async () => {
  const good = await api.fetchRiskReport(
    "/api/agents/1/risk",
    jsonResponse({ success: true, data: { agentId: 1, risk: "LOW", reasons: [] } }),
  );
  assert.equal(good.ok, true);
  assert.equal(good.data.risk, "LOW");

  const bad = await api.fetchRiskReport(
    "/api/agents/1/risk",
    jsonResponse({ success: true, data: { agentId: 1 } }),
  );
  assert.equal(bad.ok, false);
});

test("postChat posts JSON and unwraps the reply; errors carry the envelope message", async () => {
  let captured;
  const ok = await api.postChat("/api/agents/1/chat", "hi", [{ role: "user", content: "prev" }], async (url, init) => {
    captured = { url, init };
    return { ok: true, status: 200, json: async () => ({ success: true, data: { reply: "yo" } }) };
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.reply, "yo");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(captured.init.body), {
    message: "hi",
    history: [{ role: "user", content: "prev" }],
  });

  const failed = await api.postChat(
    "/api/agents/1/chat",
    "hi",
    [],
    jsonResponse({ success: false, message: "OPENROUTER_API_KEY is not set" }, { ok: false, status: 503 }),
  );
  assert.equal(failed.ok, false);
  assert.match(failed.error, /OPENROUTER_API_KEY/);
});

test("riskTone maps bands and defaults to unknown", () => {
  assert.equal(present.riskTone("LOW"), "low");
  assert.equal(present.riskTone("MEDIUM"), "medium");
  assert.equal(present.riskTone("HIGH"), "high");
  assert.equal(present.riskTone("nonsense"), "unknown");
  assert.equal(present.riskTone(""), "unknown");
});

test("formatUpdatedAt renders UTC and falls back to an em dash", () => {
  assert.equal(present.formatUpdatedAt(86400), "1970-01-02 00:00 UTC");
  assert.match(present.formatUpdatedAt(1790856000), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);
  assert.equal(present.formatUpdatedAt(0), "—");
  assert.equal(present.formatUpdatedAt(-5), "—");
  assert.equal(present.formatUpdatedAt(Number.NaN), "—");
});

test("parsePage clamps anything invalid to 1", () => {
  assert.equal(present.parsePage("3"), 3);
  assert.equal(present.parsePage("0"), 1);
  assert.equal(present.parsePage("-2"), 1);
  assert.equal(present.parsePage("abc"), 1);
  assert.equal(present.parsePage(undefined), 1);
  assert.equal(present.parsePage(["7", "8"]), 7);
});

test("parseAgentId accepts positive integers only", () => {
  assert.equal(present.parseAgentId("15"), 15);
  assert.equal(present.parseAgentId("0"), null);
  assert.equal(present.parseAgentId("-1"), null);
  assert.equal(present.parseAgentId("1.5"), null);
  assert.equal(present.parseAgentId("agents"), null);
  assert.equal(present.parseAgentId(""), null);
  assert.equal(present.parseAgentId(undefined), null);
});
