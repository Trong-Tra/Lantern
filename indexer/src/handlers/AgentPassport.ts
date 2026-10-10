import { indexer } from "envio";
import { getPassportDetails } from "../effects.js";
import { isMint } from "../mappings.js";

indexer.onEvent({ contract: "AgentPassport", event: "Transfer" }, async ({ event, context }) => {
  const tokenId = event.params.tokenId;
  const id = tokenId.toString();
  const existing = await context.Passport.get(id);

  if (existing) {
    // Subsequent transfer of a tracked passport — passports are ERC-721
    // transferable, so only the holder changes.
    context.Passport.set({ ...existing, owner: event.params.to });
    return;
  }

  if (!isMint(event.params.from)) {
    // Unseen token and not a mint — nothing meaningful to record.
    return;
  }

  // Mint: the Transfer event carries no agentId/uri, so resolve them from
  // contract storage (cached effect; safe under the double preload run).
  const details = await context.effect(getPassportDetails, { tokenId });

  context.Passport.set({
    id,
    agent_id: details.agentId.toString(),
    tokenId,
    owner: event.params.to,
    uri: details.uri,
    mintedAt: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    txHash: event.transaction.hash,
  });
  context.log.info(`PassportMinted: token ${id} agent ${details.agentId}`);
});
