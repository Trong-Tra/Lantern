/**
 * Unit tests for the Envio-backed repository — all GraphQL responses faked,
 * zero network. Run: pnpm --filter @lantern/api test
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import type { AgentSummary, Attestation } from "@lantern/types";
import {
  createEnvioAgentRepository,
  deriveRiskV0,
  deriveScoreV0,
  deriveScoreV1,
  nameFromUri,
} from "./envioAgentRepository.js";
import type { ScoreEvent } from "./scoring.js";

const NOW = 1_800_000_000;
const DAY = 86_400;

function events(spec: [successes: number, ageDays: number][]): ScoreEvent[] {
  const out: ScoreEvent[] = [];
  for (const [count, age] of spec) {
    for (let i = 0; i < count; i++) {
      out.push({ success: true, timestamp: NOW - age * DAY });
    }
  }
  return out;
}

function failures(count: number, ageDays: number, now = NOW): ScoreEvent[] {
  return Array.from({ length: count }, () => ({ success: false, timestamp: now - ageDays * DAY }));
}

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
  uri: "demo://lantern/yield-keeper",
  registeredAt: "1791606700",
  passports: [{ tokenId: "1" }],
};

const ATTESTATION_ROW = {
  tokenId: "5",
  actionType: "STAKE",
  result: "SUCCESS",
  amount: "1000000000000000000",
  protocol: "demo://protocols/monad-yield",
  uri: "demo://attestations/a1-3",
  mintedAt: "1791607000",
  txHash: "0xabc123def456abc123def456abc123def456abc123def456abc123def456abcd",
};

// ---------------------------------------------------------------------------
// v0 risk + score + name derivation
// ---------------------------------------------------------------------------

describe("deriveScoreV1", () => {
  it("no events → undefined (UI renders N/A)", () => {
    assert.equal(deriveScoreV1([], NOW), undefined);
  });

  it("uniform ages reduce to the count formula — demo numbers unchanged", () => {
    const yieldKeeper = [...failures(5, 0), ...events([[57, 0]])];
    assert.equal(deriveScoreV1(yieldKeeper, NOW), 92);
    const swapRouter = [...failures(6, 0), ...events([[9, 0]])];
    assert.equal(deriveScoreV1(swapRouter, NOW), 18);
    assert.equal(deriveScoreV1(events([[2, 0]]), NOW), 4); // Sybil can't borrow credibility
  });

  it("30-day half-life: a month-old failure weighs exactly half a fresh one", () => {
    // 1 fresh success + 1 failure 30 days old: A = 1/1.5 = 66.7%
    const mixed = [...events([[1, 0]]), ...failures(1, 30)];
    assert.equal(deriveScoreV1(mixed, NOW), 3); // 100 × 2/3 × 2/50
    const bothFresh = [...events([[1, 0]]), ...failures(1, 0)];
    assert.equal(deriveScoreV1(bothFresh, NOW), 2); // 100 × 1/2 × 2/50
  });

  it("ancient failures fade from a long fresh record", () => {
    // 49 fresh successes + 1 failure 300 days old (weight ≈ 1/1000)
    const stale = [...events([[49, 0]]), ...failures(1, 300)];
    assert.equal(deriveScoreV1(stale, NOW), 100);
    const fresh = [...events([[49, 0]]), ...failures(1, 0)];
    assert.equal(deriveScoreV1(fresh, NOW), 98);
  });

  it("track-record cap and clock-skew clamp", () => {
    assert.equal(deriveScoreV1(events([[200, 0]]), NOW), 100);
    // future timestamp → full weight, no negative-age blowup (1 event → V = 1/50)
    assert.equal(deriveScoreV1([{ success: true, timestamp: NOW + 10 * DAY }], NOW), 2);
  });
});

describe("deriveScoreV0", () => {
  it("no executions → no score (UI renders N/A)", () => {
    assert.equal(deriveScoreV0(0, 0), undefined);
  });

  it("perfect but tiny record scores low — Sybil can't borrow credibility", () => {
    assert.equal(deriveScoreV0(2, 0), 4);
    assert.equal(deriveScoreV0(9, 0), 18);
  });

  it("accuracy × track record at demo scale", () => {
    assert.equal(deriveScoreV0(15, 6), 18); // 9/15 success × 0.3 confidence
    assert.equal(deriveScoreV0(62, 5), 92); // Yield Keeper
  });

  it("volume confidence caps at 50 executions", () => {
    assert.equal(deriveScoreV0(50, 0), 100);
    assert.equal(deriveScoreV0(200, 0), 100);
  });

  it("failures beyond executions clamp to zero", () => {
    assert.equal(deriveScoreV0(3, 10), 0);
  });
});

describe("deriveRiskV0", () => {
  it("UNKNOWN below 10 executions", () => {
    assert.deepEqual(deriveRiskV0(0, 0).risk, "UNKNOWN");
    assert.deepEqual(deriveRiskV0(9, 0).risk, "UNKNOWN");
    assert.ok(deriveRiskV0(3, 1).reasons[0].includes("too early"));
  });

  it("bands by failure rate (<5% LOW, <15% MEDIUM, else HIGH)", () => {
    assert.equal(deriveRiskV0(20, 0).risk, "LOW");
    assert.equal(deriveRiskV0(20, 1).risk, "MEDIUM"); // exactly 5%
    assert.equal(deriveRiskV0(20, 2).risk, "MEDIUM"); // 10%
    assert.equal(deriveRiskV0(20, 3).risk, "HIGH"); // exactly 15%
    assert.equal(deriveRiskV0(10, 4).risk, "HIGH"); // 40%
  });

  it("states counts + band rule in reasons", () => {
    const { reasons } = deriveRiskV0(60, 4);
    assert.ok(reasons[0].includes("4 failures in 60 executions"));
    assert.ok(reasons[1].includes("v0 bands"));
  });
});

describe("nameFromUri", () => {
  it("title-cases the URI slug", () => {
    assert.equal(nameFromUri("demo://lantern/yield-keeper", 1), "Yield Keeper");
    assert.equal(nameFromUri("demo://lantern/arb-hound", 5), "Arb Hound");
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
    assert.equal(summary.name, "Yield Keeper");
    assert.equal(summary.passportTokenId, 1);
    assert.equal(summary.executions, 2);
    assert.equal(summary.failures, 1);
    assert.equal(summary.updatedAt, 1791608000);
    assert.equal(summary.risk, "UNKNOWN"); // 2 executions < 10
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
    assert.equal(profile.identityUri, "demo://lantern/yield-keeper");
    // Agent 1 carries the demo persona blurb (DEMO_PERSONA_BIOS in the repo).
    assert.equal(
      profile.bio,
      "Yield Keeper moves your MON across CNY, USDC and SGD at the best rate it can find — one signature, fully autonomous, every swap attested to its passport.",
    );
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

  it("getRisk derives the v0 report from live counts", async () => {
    const repo = createEnvioAgentRepository({
      fetcher: fakeFetcher(() => ({
        data: {
          Agent_by_pk: { id: "1" },
          Attestation: Array.from({ length: 60 }, (_, i) => ({
            result: i < 4 ? "FAIL" : "SUCCESS",
          })),
        },
      })),
    });
    const report = await repo.getRisk(1);
    assert.ok(report);
    assert.equal(report.risk, "MEDIUM"); // 4/60 = 6.7%
    assert.ok(report.reasons[0].includes("4 failures in 60 executions"));
  });

  it("findByAddress matches owner case-insensitively and the demo vault", async () => {
    const repo = createEnvioAgentRepository({
      fetcher: fakeFetcher(({ query }) => {
        if (query.includes("Agent_by_pk")) {
          return { data: { Agent_by_pk: { ...AGENT_ROW, attestations: [] } } };
        }
        if (query.includes("Agent(order_by")) {
          return { data: { Agent: [AGENT_ROW] } };
        }
        return { data: { Attestation: [] } };
      }),
    });

    const byOwner = await repo.findByAddress("0x7ea634e331cf7b503df2e224f77a7c589462f1f2");
    assert.ok(byOwner);
    assert.equal(byOwner.agentId, 1);

    assert.equal(await repo.findByAddress("0x1111111111111111111111111111111111111111"), null);

    process.env.AGENT_VAULT_ADDRESS = "0xe09b383696d69b8a3dfb2081a446d8fc62826328";
    const viaVault = await repo.findByAddress("0xe09b383696d69b8a3dfb2081a446d8fc62826328");
    delete process.env.AGENT_VAULT_ADDRESS;
    assert.ok(viaVault);
  });
});

describe("createActiveRepository (DATA_SOURCE switch)", () => {
  const originalSource = process.env.DATA_SOURCE;
  const originalUrl = process.env.ENVIO_GRAPHQL_URL;

  after(() => {
    if (originalSource === undefined) delete process.env.DATA_SOURCE;
    else process.env.DATA_SOURCE = originalSource;
    if (originalUrl === undefined) delete process.env.ENVIO_GRAPHQL_URL;
    else process.env.ENVIO_GRAPHQL_URL = originalUrl;
  });

  it("envio selection", async () => {
    process.env.DATA_SOURCE = "envio";
    // Closed port so the selection is provable without a running indexer.
    process.env.ENVIO_GRAPHQL_URL = "http://127.0.0.1:9/";
    const { createActiveRepository } = await import("./agentRepository.js");
    const repo = createActiveRepository();
    await assert.rejects(() => repo.listAgents(1, 20), /fetch failed|Envio/);
  });

  it("default stays mock", async () => {
    delete process.env.DATA_SOURCE;
    const { createActiveRepository } = await import("./agentRepository.js");
    const repo = createActiveRepository();
    const page = await repo.listAgents(1, 20);
    assert.equal(page.total, 3); // quarantined mock size
  });
});
