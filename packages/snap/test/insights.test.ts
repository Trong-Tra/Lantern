import { describe, expect, it } from "vitest";
import {
  buildAgentInsights,
  buildApiUnreachableInsights,
  buildContractDeploymentInsights,
  buildUnknownAgentInsights,
  buildUnsupportedChainInsights,
  extractToAddress,
  shouldInspect,
  truncateAddress,
  type AgentLookupResult,
} from "../src/insights";

const AGENT: AgentLookupResult = {
  agentId: 1,
  name: "Mock Yield Keeper",
  owner: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  risk: "LOW",
  executions: 128,
  failures: 4,
};

describe("guards", () => {
  it("only inspects Monad testnet", () => {
    expect(shouldInspect("eip155:10143")).toBe(true);
    expect(shouldInspect("eip155:1")).toBe(false);
  });

  it("extracts valid to addresses and rejects contract creation", () => {
    expect(extractToAddress({ to: "0xe09b383696D69B8A3Dfb2081a446D8fc62826328" })).toBe(
      "0xe09b383696D69B8A3Dfb2081a446D8fc62826328",
    );
    expect(extractToAddress({})).toBeNull();
    expect(extractToAddress({ to: null })).toBeNull();
    expect(extractToAddress({ to: "0x1234" })).toBeNull();
  });
});

describe("buildAgentInsights", () => {
  it("renders every row with score N/A when absent", () => {
    const model = buildAgentInsights(AGENT);
    expect(model.title).toBe("Mock Yield Keeper");
    const byLabel = Object.fromEntries(model.rows.map((r) => [r.label, r.value]));
    expect(byLabel["Agent ID"]).toBe("#1");
    expect(byLabel["Owner"]).toBe("0xaaaa…aaaa");
    expect(byLabel["Risk"]).toBe("LOW");
    expect(byLabel["Executions"]).toBe("128");
    expect(byLabel["Failures"]).toBe("4");
    expect(byLabel["Score"]).toBe("N/A");
  });

  it("falls back to Agent #id when the name is empty", () => {
    expect(buildAgentInsights({ ...AGENT, name: "" }).title).toBe("Agent #1");
  });

  it("renders a numeric score when present", () => {
    const byLabel = Object.fromEntries(
      buildAgentInsights({ ...AGENT, score: 87 }).rows.map((r) => [r.label, r.value]),
    );
    expect(byLabel["Score"]).toBe("87");
  });
});

describe("fallback insights", () => {
  it("unknown agent mentions the truncated address", () => {
    const model = buildUnknownAgentInsights("0xe09b383696D69B8A3Dfb2081a446D8fc62826328");
    expect(model.title).toBe("Unknown agent");
    expect(model.context).toContain("0xe09b…6328");
  });

  it("unsupported chain carries the received chain id", () => {
    expect(buildUnsupportedChainInsights("eip155:1").context).toContain("eip155:1");
  });

  it("contract deployment + unreachable states have no rows", () => {
    expect(buildContractDeploymentInsights().rows).toEqual([]);
    expect(buildApiUnreachableInsights().rows).toEqual([]);
  });
});

describe("truncateAddress", () => {
  it("truncates to 0x????…????", () => {
    expect(truncateAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe("0xaaaa…aaaa");
  });
});
