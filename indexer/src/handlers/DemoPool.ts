import { indexer } from "envio";
import { getPoolTokens } from "../effects.js";

// Sync is the reserve source of truth: DemoPool emits it on seed() and after
// every swap(), so Pool rows always track live reserves. The token pair is
// immutable and not carried by the event — resolved once per pool on-chain.
indexer.onEvent({ contract: "DemoPool", event: "Sync" }, async ({ event, context }) => {
  const id = event.srcAddress;
  const existing = await context.Pool.get(id);

  let token0 = existing?.token0;
  let token1 = existing?.token1;
  if (!existing) {
    const tokens = await context.effect(getPoolTokens, { pool: id });
    token0 = tokens.token0;
    token1 = tokens.token1;
  }

  context.Pool.set({
    id,
    token0: token0!,
    token1: token1!,
    reserve0: event.params.reserve0,
    reserve1: event.params.reserve1,
    updatedAtBlock: BigInt(event.block.number),
  });
  context.log.info(`Pool Sync: ${id} reserves=${event.params.reserve0}/${event.params.reserve1}`);
});
