import { indexer } from "envio";

indexer.onEvent({ contract: "AgentRegistry", event: "AgentRegistered" }, async ({ event, context }) => {
  const id = event.params.agentId.toString();
  context.Agent.set({
    id,
    owner: event.params.owner,
    uri: event.params.uri,
    registeredAt: BigInt(event.block.timestamp),
    updatedAt: undefined,
  });
  context.log.info(`AgentRegistered: ${id} owner=${event.params.owner}`);
});

indexer.onEvent({ contract: "AgentRegistry", event: "AgentUpdated" }, async ({ event, context }) => {
  const id = event.params.agentId.toString();
  const agent = await context.Agent.get(id);
  if (!agent) {
    // Registration predates the indexed range — should not happen with
    // start_block 0, but never crash the pipeline for it.
    context.log.warn(`AgentUpdated for unknown agent ${id}`);
    return;
  }
  context.Agent.set({ ...agent, uri: event.params.uri, updatedAt: BigInt(event.block.timestamp) });
});
