import { indexer } from "envio";

indexer.onEvent({ contract: "LanternMarket", event: "TradeSettled" }, async ({ event, context }) => {
  const agentId = event.params.agentId.toString();
  const agent = await context.Agent.get(agentId);
  if (!agent) {
    // The contract only settles quotes from registered agents, so this means
    // the registration predates the indexed range — never crash the pipeline.
    context.log.warn(`TradeSettled for unknown agent ${agentId}`);
    return;
  }

  context.Trade.set({
    id: event.transaction.hash,
    agent_id: agentId,
    user: event.params.user,
    tokenIn: event.params.tokenIn,
    tokenOut: event.params.tokenOut,
    amountIn: event.params.amountIn,
    amountOut: event.params.amountOut,
    fee: event.params.fee,
    nonce: event.params.nonce,
    settledAt: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    txHash: event.transaction.hash,
  });
  context.log.info(`TradeSettled: agent ${agentId} user=${event.params.user} out=${event.params.amountOut}`);
});
