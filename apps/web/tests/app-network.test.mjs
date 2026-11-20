import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";

const {
  agentVerifyUrl,
  build8004scanAgentUrl,
  FUJI_8004SCAN_SLUG,
  numericAgentId,
  rankAgents,
  readRegistrationAbout,
  shortAddress,
} = loadSource("src/libs/app/network.ts");

test("canonical registration About extracts text and skips missing or encoded descriptions", () => {
  const registration = (metadata) =>
    `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;
  const description = "Lantern Finance solver agent on Avalanche Fuji";
  assert.equal(readRegistrationAbout(registration({ description: ` ${description} ` })), description);
  assert.equal(readRegistrationAbout(registration({ name: "Aster" })), null);
  assert.equal(readRegistrationAbout(registration({ description: "data:text/plain;base64,SGVsbG8=" })), null);
  assert.equal(readRegistrationAbout(registration({ description: "0x48656c6c6f" })), null);
  assert.equal(readRegistrationAbout("data:application/json;base64,broken"), null);
});

test("numericAgentId parses ids and falls back to 0", () => {
  assert.equal(numericAgentId("7"), 7);
  assert.equal(numericAgentId("15"), 15);
  assert.equal(numericAgentId("not-a-number"), 0);
  assert.equal(numericAgentId(""), 0);
});

test("build8004scanAgentUrl uses chain slug + canonical token id", () => {
  // 8004scan keys by slug ("avalanche-fuji", NOT numeric 43113) and by the
  // canonical singleton token id (NOT our AgentRegistry id) — both verified
  // live 2026-11-18: 43113 → "Agent Not Found", our id 1 → someone else's token.
  assert.equal(FUJI_8004SCAN_SLUG, "avalanche-fuji");
  assert.equal(
    build8004scanAgentUrl("314"),
    "https://testnet.8004scan.io/agents/avalanche-fuji/314",
  );
  assert.equal(build8004scanAgentUrl("328"), "https://testnet.8004scan.io/agents/avalanche-fuji/328");
});

test("agentVerifyUrl needs a dual-registration mapping", () => {
  assert.equal(agentVerifyUrl({ canonicalTokenId: "315" }), "https://testnet.8004scan.io/agents/avalanche-fuji/315");
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
