import { indexer } from "envio";
import { getAttestationDetails } from "../effects.js";
import { toActionResult, toActionType } from "../mappings.js";

indexer.onEvent({ contract: "Reputation", event: "AttestationMinted" }, async ({ event, context }) => {
  const tokenId = event.params.tokenId;

  // The event carries only (agentId, tokenId, actionType, result).
  // amount/protocol/uri live in the contract's attestation struct — resolved
  // on-chain via a cached effect (no contract redeploy needed).
  const onChain = await context.effect(getAttestationDetails, { tokenId });

  context.Attestation.set({
    id: tokenId.toString(),
    agent_id: event.params.agentId.toString(),
    tokenId,
    actionType: toActionType(event.params.actionType),
    result: toActionResult(event.params.result),
    amount: onChain.amount,
    protocol: onChain.protocol,
    uri: onChain.uri,
    mintedAt: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
    txHash: event.transaction.hash,
  });
  context.log.info(`AttestationMinted: agent ${event.params.agentId} token ${tokenId}`);
});
