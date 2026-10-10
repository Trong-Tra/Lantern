import type { OnTransactionHandler } from "@metamask/snaps-sdk";
import { NodeType, type Component, type Panel } from "@metamask/snaps-sdk";
import {
  buildAgentInsights,
  buildApiUnreachableInsights,
  buildContractDeploymentInsights,
  buildUnknownAgentInsights,
  buildUnsupportedChainInsights,
  extractToAddress,
  shouldInspect,
  type AgentLookupResult,
  type InsightModel,
} from "./insights";

/**
 * Dev API base. Snap-side configuration UX (dapp settings vs env) is TBD —
 * the demo runs against the local API (docs/05).
 */
const LANTERN_API_BASE = "http://localhost:4000";
const LOOKUP_TIMEOUT_MS = 3000;

/** null = reachable, no match; "unreachable" = network/config failure. */
async function lookupAgent(address: string): Promise<AgentLookupResult | null | "unreachable"> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(`${LANTERN_API_BASE}/api/agents/lookup/${address}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: AgentLookupResult | null };
    return body.success ? (body.data ?? null) : null;
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timeout);
  }
}

/** snaps-sdk v12: components are plain objects (the old builder fns are gone). */
function render(model: InsightModel): Panel {
  const children: Component[] = [
    { type: NodeType.Heading, value: model.title },
    ...(model.context ? [{ type: NodeType.Text, value: model.context } as Component] : []),
    ...model.rows.map(
      (r): Component => ({
        type: NodeType.Row,
        label: r.label,
        value: { type: NodeType.Text, value: r.value },
      }),
    ),
  ];
  return { type: NodeType.Panel, children };
}

/** Intercepts every signing request and enriches agent-bound transactions. */
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId }) => {
  if (!shouldInspect(chainId)) {
    return { content: render(buildUnsupportedChainInsights(chainId)) };
  }

  const to = extractToAddress(transaction);
  if (!to) {
    return { content: render(buildContractDeploymentInsights()) };
  }

  const result = await lookupAgent(to);
  if (result === "unreachable") {
    return { content: render(buildApiUnreachableInsights()) };
  }
  return {
    content: render(result ? buildAgentInsights(result) : buildUnknownAgentInsights(to)),
  };
};
