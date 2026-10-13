/**
 * Envio GraphQL-backed AgentRepository (docs/03, option B).
 * Reads the indexer Hasura endpoint (docs/05); risk is derived API-side with
 * the owner-approved v0 rule below. Selection happens in agentRepository.ts
 * via the DATA_SOURCE env switch.
 */
import type {
  AgentProfile,
  AgentSummary,
  Attestation,
  RiskLevel,
  RiskReport,
} from "@lantern/types";
import type { AgentRepository, Page } from "./agentRepository.js";
import { deriveScoreV0, deriveScoreV1, type ScoreEvent } from "./scoring.js";

export { deriveScoreV0, deriveScoreV1 } from "./scoring.js";

export const DEFAULT_ENVIO_GRAPHQL_URL = "http://localhost:8080/v1/graphql";
/** Local Hasura default (docs/05). Empty on Envio Cloud (public endpoint). */
export const DEFAULT_ENVIO_ADMIN_SECRET = "testing";

// ---------------------------------------------------------------------------
// v0 risk derivation (owner-approved 2026-10-10, docs/03) and v1 lumen
// score derivation (owner-approved 2026-10-13, scoring.ts — recency-
// weighted): transparent, deterministic, stated so the UI can explain it.
// ---------------------------------------------------------------------------

export function deriveRiskV0(
  executions: number,
  failures: number,
): { risk: RiskLevel; reasons: string[] } {
  if (executions < 10) {
    return {
      risk: "UNKNOWN",
      reasons: [`${executions} executions on record — too early to judge (v0 rule)`],
    };
  }
  const failRate = failures / executions;
  const risk: RiskLevel = failRate < 0.05 ? "LOW" : failRate < 0.15 ? "MEDIUM" : "HIGH";
  return {
    risk,
    reasons: [
      `${failures} failures in ${executions} executions`,
      `Failure rate ${(failRate * 100).toFixed(1)}% — v0 bands: <5% LOW, <15% MEDIUM, else HIGH`,
    ],
  };
}

/** Display name from the on-chain URI slug: demo://lantern/yield-keeper → "Yield Keeper". */
export function nameFromUri(uri: string, agentId: number): string {
  const match = /\/([a-z0-9-]+)$/.exec(uri);
  if (!match) return `Agent #${agentId}`;
  return match[1]
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// GraphQL plumbing
// ---------------------------------------------------------------------------

type Fetcher = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface EnvioAgentRepositoryConfig {
  graphqlUrl?: string;
  adminSecret?: string;
  fetcher?: Fetcher;
}

interface AttestationRow {
  tokenId: string;
  actionType: string;
  result: string;
  amount: string | null;
  protocol: string | null;
  uri: string | null;
  mintedAt: string;
  txHash: string;
}

interface AgentRow {
  id: string;
  owner: string;
  uri: string;
  registeredAt: string;
  passports: { tokenId: string }[];
}

interface Stats {
  executions: number;
  failures: number;
  updatedAt: number;
  /** Timestamped outcomes — feed for the v1 recency-weighted score. */
  events: ScoreEvent[];
}

function collectStats(attestations: { result: string; mintedAt: string }[]): Stats {
  let updatedAt = 0;
  let failures = 0;
  const events: ScoreEvent[] = [];
  for (const att of attestations) {
    if (att.result === "FAIL") failures += 1;
    const timestamp = Number(att.mintedAt);
    events.push({ success: att.result !== "FAIL", timestamp });
    updatedAt = Math.max(updatedAt, timestamp);
  }
  return { executions: attestations.length, failures, updatedAt, events };
}

function toAttestation(row: AttestationRow): Attestation {
  return {
    tokenId: Number(row.tokenId),
    agentId: 0, // filled by the caller (the query scope knows it)
    actionType: row.actionType as Attestation["actionType"],
    result: row.result as Attestation["result"],
    amount: row.amount ?? undefined,
    protocol: row.protocol ?? undefined,
    uri: row.uri ?? undefined,
    txHash: row.txHash,
    timestamp: Number(row.mintedAt),
  };
}

const AGENT_FIELDS = /* GraphQL */ `
  id
  owner
  uri
  registeredAt
  passports {
    tokenId
  }
`;

export function createEnvioAgentRepository(
  config: EnvioAgentRepositoryConfig = {},
): AgentRepository {
  // `||` (not `??`): empty env values count as unset.
  const graphqlUrl =
    config.graphqlUrl || process.env.ENVIO_GRAPHQL_URL || DEFAULT_ENVIO_GRAPHQL_URL;
  const adminSecret =
    config.adminSecret || process.env.ENVIO_ADMIN_SECRET || DEFAULT_ENVIO_ADMIN_SECRET;
  const fetcher: Fetcher = config.fetcher ?? ((url, init) => fetch(url, init));

  async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (adminSecret) headers["x-hasura-admin-secret"] = adminSecret;
    const res = await fetcher(graphqlUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Envio HTTP ${res.status}`);
    const body = (await res.json()) as { errors?: { message: string }[]; data?: T };
    if (body.errors?.length) {
      throw new Error(`Envio GraphQL error: ${body.errors[0].message}`);
    }
    return body.data as T;
  }

  /** All attestations (agent_id + result + mintedAt) for stats aggregation. */
  async function fetchAllAttestationStats(): Promise<Map<string, { result: string; mintedAt: string }[]>> {
    const data = await gql<{ Attestation: { agent_id: string; result: string; mintedAt: string }[] }>(
      `query { Attestation { agent_id result mintedAt } }`,
      {},
    );
    const map = new Map<string, { result: string; mintedAt: string }[]>();
    for (const att of data.Attestation) {
      const list = map.get(att.agent_id) ?? [];
      list.push(att);
      map.set(att.agent_id, list);
    }
    return map;
  }

  function rowToSummary(row: AgentRow, stats: Stats): AgentSummary {
    const agentId = Number(row.id);
    const { risk } = deriveRiskV0(stats.executions, stats.failures);
    return {
      agentId,
      name: nameFromUri(row.uri, agentId),
      passportTokenId: row.passports[0] ? Number(row.passports[0].tokenId) : undefined,
      owner: row.owner,
      risk,
      score: deriveScoreV1(stats.events, Math.floor(Date.now() / 1000)),
      executions: stats.executions,
      failures: stats.failures,
      updatedAt: stats.updatedAt || Number(row.registeredAt),
    };
  }

  return {
    async listAgents(page, limit) {
      const data = await gql<{
        Agent_aggregate: { aggregate: { count: number } };
        Agent: AgentRow[];
      }>(
        `query ($limit: Int!, $offset: Int!) {
          Agent_aggregate { aggregate { count } }
          Agent(order_by: {id: asc}, limit: $limit, offset: $offset) {
            ${AGENT_FIELDS}
          }
        }`,
        { limit, offset: (page - 1) * limit },
      );
      const statsByAgent = await fetchAllAttestationStats();
      const items = data.Agent.map((row) =>
        rowToSummary(row, collectStats(statsByAgent.get(row.id) ?? [])),
      );
      return { items, total: data.Agent_aggregate.aggregate.count };
    },

    async getAgent(agentId) {
      const data = await gql<{ Agent_by_pk: (AgentRow & { attestations: AttestationRow[] }) | null }>(
        `query ($id: String!) {
          Agent_by_pk(id: $id) {
            ${AGENT_FIELDS}
            attestations(order_by: {tokenId: desc}) {
              tokenId
              actionType
              result
              amount
              protocol
              uri
              mintedAt
              txHash
            }
          }
        }`,
        { id: String(agentId) },
      );
      const row = data.Agent_by_pk;
      if (!row) return null;

      const stats = collectStats(row.attestations);
      const summary = rowToSummary(row, stats);
      return {
        ...summary,
        identityUri: row.uri,
        passportUri: undefined, // fetched on demand when metadata URIs resolve (TBD)
        bio: undefined, // persona blurb is mock-only until off-chain metadata lands
        attestations: row.attestations.map((att) => ({
          ...toAttestation(att),
          agentId,
        })),
      };
    },

    async getAttestations(agentId, page, limit) {
      const data = await gql<{
        Agent_by_pk: { id: string } | null;
        Attestation_aggregate: { aggregate: { count: number } };
        Attestation: AttestationRow[];
      }>(
        `query ($id: String!, $limit: Int!, $offset: Int!) {
          Agent_by_pk(id: $id) { id }
          Attestation_aggregate(where: {agent_id: {_eq: $id}}) { aggregate { count } }
          Attestation(
            where: {agent_id: {_eq: $id}}
            order_by: {tokenId: desc}
            limit: $limit
            offset: $offset
          ) {
            tokenId
            actionType
            result
            amount
            protocol
            uri
            mintedAt
            txHash
          }
        }`,
        { id: String(agentId), limit, offset: (page - 1) * limit },
      );
      if (!data.Agent_by_pk) return null;
      return {
        items: data.Attestation.map((att) => ({ ...toAttestation(att), agentId })),
        total: data.Attestation_aggregate.aggregate.count,
      };
    },

    async getRisk(agentId) {
      const data = await gql<{
        Agent_by_pk: { id: string } | null;
        Attestation: { result: string }[];
      }>(
        `query ($id: String!) {
          Agent_by_pk(id: $id) { id }
          Attestation(where: {agent_id: {_eq: $id}}) { result }
        }`,
        { id: String(agentId) },
      );
      if (!data.Agent_by_pk) return null;
      const failures = data.Attestation.filter((att) => att.result === "FAIL").length;
      const { risk, reasons } = deriveRiskV0(data.Attestation.length, failures);
      const report: RiskReport = { agentId, risk, reasons };
      return report;
    },

    async findByAddress(address) {
      // Demo vault mapping (same rule as the mock source): the deployed
      // AgentVault serves the reference agent. The indexer-driven source
      // could read vault.agentId on-chain later (docs/03 TODO).
      const vaultAddress = process.env.AGENT_VAULT_ADDRESS?.toLowerCase();
      if (vaultAddress && address === vaultAddress) {
        const vaultAgentId = Number(process.env.AGENT_VAULT_AGENT_ID ?? 1);
        const agent = await this.getAgent(vaultAgentId);
        if (agent) {
          const { identityUri: _i, passportUri: _p, attestations: _a, bio: _b, ...summary } = agent;
          return summary;
        }
      }

      const data = await gql<{ Agent: AgentRow[] }>(
        `query { Agent(order_by: {id: asc}) { ${AGENT_FIELDS} } }`,
        {},
      );
      const row = data.Agent.find((agent) => agent.owner.toLowerCase() === address);
      if (!row) return null;
      const statsByAgent = await fetchAllAttestationStats();
      return rowToSummary(row, collectStats(statsByAgent.get(row.id) ?? []));
    },
  };
}
