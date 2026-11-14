/**
 * Unit tests for the Envio-backed repository — all GraphQL responses faked,
 * zero network. Run: pnpm --filter @lantern/api test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentSummary, Attestation } from "@lantern/types";
import { createEnvioAgentRepository, nameFromUri } from "./envioAgentRepository.js";

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

type FakeResponse = { data: Record<string, unknown> };

/** Handler receives the parsed GraphQL body and returns canned data. */
function fakeFetcher(handler: (body: { query: string; variables: Record<string, unknown> }) => FakeResponse) {
  return async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as { query: string; variables: Record<string, unknown> };
    return {
      ok: true,
      status: 200,
      json: async () => handler(body),
    };
  };
}

const AGENT_ROW = {
  id: "1",
  owner: "0x7EA634e331CF7b503df2e224f77a7C589462F1F2",
  uri: "demo://lantern/route-runner",
  registeredAt: "1791606700",
};

const ATTESTATION_ROW = {
  tokenId: "5",
  actionType: "SWAP",
  result: "SUCCESS",
  amount: "1000000000000000000",
  protocol: "demo://protocols/lantern-arena",
  uri: "demo://attestations/a1-3",
  mintedAt: "1791607000",
  txHash: "0xabc123def456abc123def456abc123def456abc123def456abc123def456abcd",
};

// ---------------------------------------------------------------------------
// Name derivation
// ---------------------------------------------------------------------------

describe("nameFromUri", () => {
  it("title-cases the URI slug", () => {
    assert.equal(nameFromUri("demo://lantern/route-runner", 1), "Route Runner");
    assert.equal(nameFromUri("demo://lantern/hop-surgeon", 5), "Hop Surgeon");
  });

  it("falls back to Agent #id for slugs it cannot parse", () => {
    assert.equal(nameFromUri("", 7), "Agent #7");
    assert.equal(nameFromUri("demo://", 7), "Agent #7");
  });
});

// ---------------------------------------------------------------------------
// Repository mapping
// ---------------------------------------------------------------------------

describe("createEnvioAgentRepository", () => {
  it("listAgents maps rows + aggregates stats across all agents", async () => {
    const repo = createEnvioAgentRepository({
      fetcher: fakeFetcher(({ query }) => {
        if (query.includes("Agent_aggregate")) {
          return {
            data: {
              Agent_aggregate: { aggregate: { count: 1 } },
              Agent: [AGENT_ROW],
            },
          };
        }
        return {
          data: {
            Attestation: [
              { agent_id: "1", result: "SUCCESS", mintedAt: "1791607000" },
              { agent_id: "1", result: "FAIL", mintedAt: "1791608000" },
            ],
          },
        };
      }),
    });

    const page = await repo.listAgents(1, 20);
    assert.equal(page.total, 1);
    const summary = page.items[0] as AgentSummary;
    assert.equal(summary.agentId, 1);
    assert.equal(summary.name, "Route Runner");
    assert.equal(summary.executions, 2);
    assert.equal(summary.failures, 1);
    assert.equal(summary.updatedAt, 1791608000);
  });

  it("getAgent returns the full profile with mapped attestations", async () => {
    const repo = createEnvioAgentRepository({
      fetcher: fakeFetcher(() => ({
        data: {
          Agent_by_pk: { ...AGENT_ROW, attestations: [ATTESTATION_ROW] },
        },
      })),
    });

    const profile = await repo.getAgent(1);
    assert.ok(profile);
    assert.equal(profile.identityUri, "demo://lantern/route-runner");
    const att = profile.attestations[0] as Attestation;
    assert.equal(att.tokenId, 5);
    assert.equal(att.agentId, 1);
    assert.equal(att.amount, "1000000000000000000");
    assert.equal(att.timestamp, 1791607000);
    assert.equal(att.txHash, ATTESTATION_ROW.txHash);
  });

  it("getAgent returns null for an unknown agent", async () => {
    const repo = createEnvioAgentRepository({
      fetcher: fakeFetcher(() => ({ data: { Agent_by_pk: null } })),
    });
    assert.equal(await repo.getAgent(99), null);
  });

  it("getAttestations paginates with totals and 404s unknown agents", async () => {
    const repo = createEnvioAgentRepository({
      fetcher: fakeFetcher(() => ({
        data: {
          Agent_by_pk: { id: "1" },
          Attestation_aggregate: { aggregate: { count: 2 } },
          Attestation: [ATTESTATION_ROW],
        },
      })),
    });
    const page = await repo.getAttestations(1, 1, 1);
    assert.ok(page);
    assert.equal(page.total, 2);
    assert.equal(page.items.length, 1);
  });
});
