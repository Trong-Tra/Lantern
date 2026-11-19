import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";

const {
  agentPin,
  agentPins,
  agentVerifyUrl,
  build8004scanAgentUrl,
  FUJI_8004SCAN_SLUG,
  numericAgentId,
  rankAgents,
  shortAddress,
} = loadSource("src/libs/app/network.ts");

test("numericAgentId parses ids and falls back to 0", () => {
  assert.equal(numericAgentId("7"), 7);
  assert.equal(numericAgentId("15"), 15);
  assert.equal(numericAgentId("not-a-number"), 0);
  assert.equal(numericAgentId(""), 0);
});

test("agentPin cycles illustrative cities by id", () => {
  const a = agentPin("1");
  const b = agentPin("1");
  assert.deepEqual(a, b);
  assert.equal(typeof a.longitude, "number");
  assert.equal(typeof a.latitude, "number");
  assert.ok(a.label.length > 0);
  // id 1 and id 13 share the same slot (12 cities)
  assert.deepEqual(agentPin("13"), { ...a, agentId: "13" });
});

test("agentPins maps every id and keeps order", () => {
  const pins = agentPins(["3", "1", "2"]);
  assert.equal(pins.length, 3);
  assert.deepEqual(
    pins.map((p) => p.agentId),
    ["3", "1", "2"],
  );
});

test("build8004scanAgentUrl uses chain slug + canonical token id", () => {
  // 8004scan keys by slug ("avalanche-fuji", NOT numeric 43113) and by the
  // canonical singleton token id (NOT our AgentRegistry id) — both verified
  // live 2026-11-18: 43113 → "Agent Not Found", our id 1 → someone else's token.
  assert.equal(FUJI_8004SCAN_SLUG, "avalanche-fuji");
  assert.equal(
    build8004scanAgentUrl("314"),
    "https://8004scan.io/agents/avalanche-fuji/314",
  );
  assert.equal(build8004scanAgentUrl("328"), "https://8004scan.io/agents/avalanche-fuji/328");
});

test("agentVerifyUrl needs a dual-registration mapping", () => {
  assert.equal(agentVerifyUrl({ canonicalTokenId: "315" }), "https://8004scan.io/agents/avalanche-fuji/315");
  assert.equal(agentVerifyUrl({ canonicalTokenId: null }), null);
  assert.equal(agentVerifyUrl({ canonicalTokenId: "" }), null);
});

test("shortAddress elides long addresses only", () => {
  assert.equal(shortAddress("0x1234567890abcdef"), "0x1234…cdef");
  assert.equal(shortAddress("0xabc"), "0xabc");
});

test("rankAgents sorts by attestations desc then id asc", () => {
  const ranked = rankAgents([
    { id: "4", owner: "0x4", registeredAt: "2026-01-04", attestationCount: 2 },
    { id: "2", owner: "0x2", registeredAt: "2026-01-02", attestationCount: 9 },
    { id: "3", owner: "0x3", registeredAt: "2026-01-03", attestationCount: 9 },
    { id: "1", owner: "0x1", registeredAt: "2026-01-01", attestationCount: 0 },
  ]);
  assert.deepEqual(
    ranked.map((a) => [a.rank, a.id]),
    [
      [1, "2"],
      [2, "3"],
      [3, "4"],
      [4, "1"],
    ],
  );
});

test("rankAgents is pure — input array untouched", () => {
  const input = [
    { id: "1", owner: "0x1", registeredAt: "r", attestationCount: 1 },
    { id: "2", owner: "0x2", registeredAt: "r", attestationCount: 5 },
  ];
  const before = input.map((a) => a.id);
  rankAgents(input);
  assert.deepEqual(
    input.map((a) => a.id),
    before,
  );
});
