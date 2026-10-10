import { describe, expect, it } from "vitest";
import { createTestIndexer, type Address } from "envio";
import { isMint, toActionResult, toActionType, ZERO_ADDRESS } from "../src/mappings.js";

// Handler registration side effects (required by createTestIndexer).
import "../src/handlers/AgentRegistry.js";
import "../src/handlers/AgentPassport.js";
import "../src/handlers/Reputation.js";

const OWNER: Address = "0x7EA634e331CF7b503df2e224f77a7C589462F1F2";

describe("mappings", () => {
  it("maps ActionType indices to schema enum values", () => {
    expect(toActionType(0n)).toBe("STAKE");
    expect(toActionType(1n)).toBe("UNSTAKE");
    expect(toActionType(2n)).toBe("HARVEST");
    expect(toActionType(3n)).toBe("SWAP");
    expect(() => toActionType(4n)).toThrow();
  });

  it("maps ActionResult indices to schema enum values", () => {
    expect(toActionResult(0n)).toBe("SUCCESS");
    expect(toActionResult(1n)).toBe("FAIL");
    expect(() => toActionResult(2n)).toThrow();
  });

  it("detects mints only from the zero address", () => {
    expect(isMint(ZERO_ADDRESS)).toBe(true);
    expect(isMint(OWNER)).toBe(false);
  });
});

describe("AgentRegistry handlers", () => {
  it("creates an Agent on AgentRegistered", async () => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "AgentRegistry",
              event: "AgentRegistered",
              block: { number: 100, timestamp: 1_700_000_000 },
              transaction: { hash: "0xdeadbeef01" },
              params: { agentId: 1n, owner: OWNER, uri: "demo://agents/1" },
            },
          ],
        },
      },
    });

    const agent = await indexer.Agent.getOrThrow("1");
    expect(agent.owner).toBe(OWNER);
    expect(agent.uri).toBe("demo://agents/1");
    expect(agent.registeredAt).toBe(1_700_000_000n);
    expect(agent.updatedAt).toBeUndefined();
  });

  it("updates uri + updatedAt on AgentUpdated", async () => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        10143: {
          simulate: [
            {
              contract: "AgentRegistry",
              event: "AgentRegistered",
              block: { number: 100, timestamp: 1_700_000_000 },
              params: { agentId: 1n, owner: OWNER, uri: "demo://agents/1" },
            },
            {
              contract: "AgentRegistry",
              event: "AgentUpdated",
              block: { number: 200, timestamp: 1_700_000_100 },
              params: { agentId: 1n, uri: "demo://agents/1-v2" },
            },
          ],
        },
      },
    });

    const agent = await indexer.Agent.getOrThrow("1");
    expect(agent.uri).toBe("demo://agents/1-v2");
    expect(agent.updatedAt).toBe(1_700_000_100n);
    expect(agent.registeredAt).toBe(1_700_000_000n);
  });
});
