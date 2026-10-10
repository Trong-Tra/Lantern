import type { Address, Enum } from "envio";

// Mirrors the enums in schema.graphql. Kept in sync by tsc: assigning a
// wrong string to an entity field fails typecheck.
export type ActionType = Enum<"ActionType">;
export type ActionResult = Enum<"ActionResult">;

export const ACTION_TYPES: readonly ActionType[] = ["STAKE", "UNSTAKE", "HARVEST", "SWAP"];
export const ACTION_RESULTS: readonly ActionResult[] = ["SUCCESS", "FAIL"];

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

/** ERC-721 mint detection: `Transfer` with `from` = zero address. */
export function isMint(from: Address): boolean {
  return from === ZERO_ADDRESS;
}

export function toActionType(value: bigint): ActionType {
  const mapped = ACTION_TYPES[Number(value)];
  if (!mapped) throw new Error(`Unknown ActionType index: ${value}`);
  return mapped;
}

export function toActionResult(value: bigint): ActionResult {
  const mapped = ACTION_RESULTS[Number(value)];
  if (!mapped) throw new Error(`Unknown ActionResult index: ${value}`);
  return mapped;
}
