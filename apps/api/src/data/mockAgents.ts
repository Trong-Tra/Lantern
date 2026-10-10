/**
 * ⚠️ MOCK DATA — FICTIONAL DEMO PROFILES ONLY.
 *
 * Quarantined per docs/06: everything in this file is explicitly fictional and
 * must never be mixed with live/indexed data. When Envio lands, the real
 * repository replaces this source (see ../repositories/agentRepository.ts).
 *
 * - `score` is intentionally absent everywhere: the formula is TBD (docs/03).
 * - `risk` values are structural placeholders so the response shape is testable.
 * - Amounts are decimal strings of mock wei values. Timestamps are unix seconds.
 */
import type { AgentProfile, AgentSummary, Attestation, RiskReport } from "@lantern/types";
import type { AgentRepository, Page } from "../repositories/agentRepository.js";

const MOCK_AGENTS: AgentProfile[] = [
  {
    agentId: 1,
    name: "Mock Yield Keeper",
    passportTokenId: 1,
    owner: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    risk: "LOW",
    executions: 128,
    failures: 4,
    updatedAt: 1_790_856_000,
    identityUri: "ipfs://mock-agent-1",
    passportUri: "ipfs://mock-passport-1",
    bio: "Steady yield keeper that restakes MON into blue-chip Monad DeFi pools. Calm, methodical, allergic to leverage.",
    attestations: [
      {
        tokenId: 3,
        agentId: 1,
        actionType: "SWAP",
        result: "SUCCESS",
        protocol: "MockSwap",
        amount: "12500000000000000000",
        uri: "ipfs://mock-att-3",
        timestamp: 1_790_856_000,
      },
      {
        tokenId: 2,
        agentId: 1,
        actionType: "HARVEST",
        result: "FAIL",
        protocol: "MockStake",
        amount: "4200000000000000000",
        uri: "ipfs://mock-att-2",
        timestamp: 1_790_812_800,
      },
      {
        tokenId: 1,
        agentId: 1,
        actionType: "STAKE",
        result: "SUCCESS",
        protocol: "MockStake",
        amount: "100000000000000000000",
        uri: "ipfs://mock-att-1",
        timestamp: 1_790_769_600,
      },
    ],
  },
  {
    agentId: 2,
    name: "Mock Swap Router",
    passportTokenId: 2,
    owner: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    risk: "MEDIUM",
    executions: 57,
    failures: 12,
    updatedAt: 1_790_812_800,
    identityUri: "ipfs://mock-agent-2",
    passportUri: "ipfs://mock-passport-2",
    bio: "Aggressive swap router chasing best execution across Monad DEXs. Talks fast and admits its failures openly.",
    attestations: [
      {
        tokenId: 4,
        agentId: 2,
        actionType: "SWAP",
        result: "FAIL",
        protocol: "MockSwap",
        amount: "8800000000000000000",
        uri: "ipfs://mock-att-4",
        timestamp: 1_790_812_800,
      },
    ],
  },
  {
    // Fresh agent: registered but passport not minted yet (optional fields).
    agentId: 3,
    name: "Mock Fresh Agent",
    owner: "0xcccccccccccccccccccccccccccccccccccccccc",
    risk: "UNKNOWN",
    executions: 0,
    failures: 0,
    updatedAt: 1_790_769_600,
    identityUri: "ipfs://mock-agent-3",
    bio: "Newly registered scout still forming its strategy. Curious, careful, has nothing to prove yet.",
    attestations: [],
  },
];

const MOCK_RISK_REASONS: Record<number, string[]> = {
  1: ["128 executions, 4 failures (mock data)", "Consistent harvest cadence (mock data)"],
  2: ["12 failures in 57 executions (mock data)", "Frequent swaps (mock data)"],
  3: ["No attestations yet (mock data)"],
};

function toSummary(agent: AgentProfile): AgentSummary {
  const { identityUri: _identityUri, passportUri: _passportUri, attestations: _attestations, ...summary } =
    agent;
  return summary;
}

function paginate<T>(items: T[], page: number, limit: number): Page<T> {
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total: items.length };
}

/** Newest-first ordering shared by all attestation responses. */
function byNewestFirst(a: Attestation, b: Attestation): number {
  return b.timestamp - a.timestamp || b.tokenId - a.tokenId;
}

/** Builds the quarantined mock repository (explicit data source, docs/06). */
export function createMockAgentRepository(): AgentRepository {
  return {
    async listAgents(page, limit) {
      const summaries = [...MOCK_AGENTS].sort((a, b) => a.agentId - b.agentId).map(toSummary);
      return paginate(summaries, page, limit);
    },

    async getAgent(agentId) {
      return MOCK_AGENTS.find((agent) => agent.agentId === agentId) ?? null;
    },

    async getAttestations(agentId, page, limit) {
      const agent = MOCK_AGENTS.find((a) => a.agentId === agentId);
      if (!agent) return null;
      const attestations = agent.attestations.slice().sort(byNewestFirst);
      return paginate(attestations, page, limit);
    },

    async getRisk(agentId) {
      const agent = MOCK_AGENTS.find((a) => a.agentId === agentId);
      if (!agent) return null;
      const report: RiskReport = {
        agentId,
        risk: agent.risk,
        reasons: MOCK_RISK_REASONS[agentId] ?? [],
      };
      return report;
    },

    async findByAddress(address) {
      // Demo vault mapping: the deployed AgentVault serves the reference agent
      // (docs/02). Real source (Envio) will read vault.agentId on-chain later.
      const vaultAddress = process.env.AGENT_VAULT_ADDRESS?.toLowerCase();
      if (vaultAddress && address === vaultAddress) {
        const vaultAgentId = Number(process.env.AGENT_VAULT_AGENT_ID ?? 1);
        const vaultAgent = MOCK_AGENTS.find((a) => a.agentId === vaultAgentId);
        if (vaultAgent) return toSummary(vaultAgent);
      }

      const ownerMatch = MOCK_AGENTS.find((a) => a.owner.toLowerCase() === address);
      return ownerMatch ? toSummary(ownerMatch) : null;
    },
  };
}
