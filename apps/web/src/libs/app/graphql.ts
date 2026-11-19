/**
 * gqlgen agents query for the App network showcase.
 * Schema source: services/market/internal/api/schema.graphqls
 * Responses are standard GraphQL `{ data, errors }` — no REST envelope.
 */

export type GqlAgent = {
  id: string;
  owner: string;
  uri: string;
  registeredAt: string;
  updatedAt: string | null;
  canonicalTokenId: string | null;
  attestations: Array<{ id: string }>;
};

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const AGENTS_QUERY = /* GraphQL */ `
  query AppNetworkAgents {
    agents {
      id
      owner
      uri
      registeredAt
      updatedAt
      canonicalTokenId
      attestations {
        id
      }
    }
  }
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * POST the agents query and return the agent list.
 * Throws on network failure, non-OK HTTP, or GraphQL errors.
 */
export async function fetchGqlAgents(
  baseUrl: string,
  fetcher: FetchLike,
  signal?: AbortSignal,
): Promise<GqlAgent[]> {
  const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: AGENTS_QUERY }),
    signal,
  });
  if (!response.ok) throw new Error(`graphql agents → HTTP ${response.status}`);
  const body = await response.json();
  if (!isRecord(body)) throw new Error("graphql agents → malformed body");
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const first = body.errors[0];
    const message = isRecord(first) && typeof first.message === "string" ? first.message : "graphql error";
    throw new Error(`graphql agents → ${message}`);
  }
  const data = body.data;
  if (!isRecord(data) || !Array.isArray(data.agents)) {
    throw new Error("graphql agents → missing data.agents");
  }
  return data.agents as GqlAgent[];
}

/** Map a GraphQL agent into the showcase record shape. */
export function toAgentRecord(agent: GqlAgent): {
  id: string;
  owner: string;
  registeredAt: string;
  attestationCount: number;
  canonicalTokenId: string | null;
} {
  return {
    id: agent.id,
    owner: agent.owner,
    registeredAt: agent.registeredAt,
    attestationCount: Array.isArray(agent.attestations) ? agent.attestations.length : 0,
    canonicalTokenId: agent.canonicalTokenId ?? null,
  };
}
