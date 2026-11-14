import { describe, expect, it } from "vitest";
import { createTestIndexer, type Address } from "envio";
import { toActionResult, toActionType } from "../src/mappings.js";

// Handler registration side effects (required by createTestIndexer).
import "../src/handlers/AgentRegistry.js";
import "../src/handlers/Reputation.js";
import "../src/handlers/DemoPool.js";
import "../src/handlers/LanternMarket.js";

// Chain key must be the literal 43113 (Avalanche Fuji) for the test indexer.
const OWNER: Address = "0x7EA634e331CF7b503df2e224f77a7C589462F1F2";
// Must match the DemoPool address in config.yaml — the zero-address placeholder
// until the Fuji redeploy fills in real pool addresses.
const POOL: Address = "0x0000000000000000000000000000000000000000";
const TOKEN_A: Address = "0x2000000000000000000000000000000000000001";
const TOKEN_B: Address = "0x2000000000000000000000000000000000000002";

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
});

describe("AgentRegistry handlers", () => {
  it("creates an Agent on AgentRegistered", async () => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        43113: {
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
        43113: {
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

describe("DemoPool handlers", () => {
  it("updates reserves on Sync for a known pool (tokens resolved on-chain only once)", async () => {
    const indexer = createTestIndexer();
    // Pre-seed the pool so the handler skips the getPoolTokens effect (RPC).
    indexer.Pool.set({
      id: POOL,
      token0: TOKEN_A,
      token1: TOKEN_B,
      reserve0: 100_000n,
      reserve1: 200_000n,
      updatedAtBlock: 1n,
    });

    await indexer.process({
      chains: {
        43113: {
          simulate: [
            {
              contract: "DemoPool",
              event: "Sync",
              srcAddress: POOL,
              block: { number: 300, timestamp: 1_700_000_200 },
              params: { reserve0: 101_000n, reserve1: 198_010n },
            },
          ],
        },
      },
    });

    const pool = await indexer.Pool.getOrThrow(POOL);
    expect(pool.reserve0).toBe(101_000n);
    expect(pool.reserve1).toBe(198_010n);
    expect(pool.updatedAtBlock).toBe(300n);
    expect(pool.token0).toBe(TOKEN_A);
  });
});

describe("LanternMarket handlers", () => {
  it("creates a Trade on TradeSettled for a registered agent", async () => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        43113: {
          simulate: [
            {
              contract: "AgentRegistry",
              event: "AgentRegistered",
              block: { number: 100, timestamp: 1_700_000_000 },
              params: { agentId: 1n, owner: OWNER, uri: "demo://agents/1" },
            },
            {
              contract: "LanternMarket",
              event: "TradeSettled",
              block: { number: 400, timestamp: 1_700_000_400 },
              transaction: { hash: "0xdeadbeef02" },
              params: {
                agentId: 1n,
                user: "0x3000000000000000000000000000000000000001",
                tokenIn: TOKEN_A,
                tokenOut: TOKEN_B,
                amountIn: 1_000n,
                amountOut: 1_980n,
                fee: 4n,
                nonce: 1n,
              },
            },
          ],
        },
      },
    });

    const trade = await indexer.Trade.getOrThrow("0xdeadbeef02");
    expect(trade.agent_id).toBe("1");
    expect(trade.amountIn).toBe(1_000n);
    expect(trade.amountOut).toBe(1_980n);
    expect(trade.fee).toBe(4n);
    expect(trade.settledAt).toBe(1_700_000_400n);
  });

  it("skips TradeSettled for an unknown agent instead of crashing", async () => {
    const indexer = createTestIndexer();
    await indexer.process({
      chains: {
        43113: {
          simulate: [
            {
              contract: "LanternMarket",
              event: "TradeSettled",
              block: { number: 400, timestamp: 1_700_000_400 },
              transaction: { hash: "0xdeadbeef03" },
              params: {
                agentId: 99n,
                user: "0x3000000000000000000000000000000000000001",
                tokenIn: TOKEN_A,
                tokenOut: TOKEN_B,
                amountIn: 1_000n,
                amountOut: 1_980n,
                fee: 4n,
                nonce: 1n,
              },
            },
          ],
        },
      },
    });

    expect(await indexer.Trade.get("0xdeadbeef03")).toBeUndefined();
  });
});
