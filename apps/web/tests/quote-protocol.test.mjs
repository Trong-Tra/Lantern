import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { applyQuoteFrame, initialQuoteState, quoteMeetsSlippage } = loadSource(
  "src/libs/market/quote-ws.ts"
);

const quote = (overrides = {}) => ({
  agentId: "3",
  user: "0x1111111111111111111111111111111111111111",
  tokenIn: "0x2222222222222222222222222222222222222222",
  tokenOut: "0x3333333333333333333333333333333333333333",
  amountIn: "1000000000000000000",
  minOut: "995000000000000000",
  quotedOut: "1000000000000000000",
  deadline: "1700000000",
  nonce: "7",
  routes: [{ bps: 10000, pools: ["0x4444444444444444444444444444444444444444"] }],
  ...overrides,
});

function opened() {
  let state = initialQuoteState();
  state = { ...state, awaitingIntent: true };
  state = applyQuoteFrame(state, { type: "intent_opened", intentId: "i-1" });
  return state;
}

test("intent_opened only lands while an intent is awaiting", () => {
  const idle = applyQuoteFrame(initialQuoteState(), { type: "intent_opened", intentId: "i-1" });
  assert.equal(idle.intentId, null);
  assert.equal(idle.awaitingIntent, false);

  const state = opened();
  assert.equal(state.intentId, "i-1");
  assert.equal(state.awaitingIntent, false);
});

test("quotes stream in for the open intent; stale intents are dropped", () => {
  let state = opened();
  state = applyQuoteFrame(state, {
    type: "quote",
    intentId: "i-1",
    quoteId: "3:7",
    quote: quote(),
    signature: "0xabc",
  });
  assert.equal(Object.keys(state.quotes).length, 1);
  assert.equal(state.quotes["3:7"].signature, "0xabc");

  // Frames from an older intent never surface.
  state = applyQuoteFrame(state, {
    type: "quote",
    intentId: "i-0",
    quoteId: "9:1",
    quote: quote({ agentId: "9" }),
    signature: "0xdead",
  });
  assert.equal(Object.keys(state.quotes).length, 1);
});

test("retract removes exactly that quote", () => {
  let state = opened();
  for (const id of ["3:7", "4:8"])
    state = applyQuoteFrame(state, {
      type: "quote",
      intentId: "i-1",
      quoteId: id,
      quote: quote({ agentId: id.split(":")[0] }),
      signature: "0x" + id,
    });
  state = applyQuoteFrame(state, { type: "retract", intentId: "i-1", quoteId: "3:7" });
  assert.deepEqual(Object.keys(state.quotes), ["4:8"]);
  // Unknown retract ids are ignored.
  const after = applyQuoteFrame(state, { type: "retract", intentId: "i-1", quoteId: "nope" });
  assert.deepEqual(after, state);
});

test("picked confirms the chosen quote; closed ends the stream", () => {
  let state = opened();
  state = applyQuoteFrame(state, {
    type: "picked",
    intentId: "i-1",
    quoteId: "3:7",
    quote: quote(),
    signature: "0xabc",
  });
  assert.equal(state.picked.quoteId, "3:7");

  state = applyQuoteFrame(state, { type: "closed", intentId: "i-1", reason: "picked" });
  assert.equal(state.closed, "picked");
  assert.equal(state.awaitingIntent, false);
  // Picked survives the close (the UI still shows what was chosen).
  assert.equal(state.picked.quoteId, "3:7");
});

test("error frames surface their message; junk frames are ignored", () => {
  const withError = applyQuoteFrame(opened(), { type: "error", message: "intent expired" });
  assert.equal(withError.error, "intent expired");
  assert.equal(applyQuoteFrame(initialQuoteState(), { type: "error" }).error, "quote stream error");

  const base = opened();
  assert.equal(applyQuoteFrame(base, null), base);
  assert.equal(applyQuoteFrame(base, { type: "mystery" }), base);
  assert.equal(applyQuoteFrame(base, "not json"), base);
});

test("slippage filter: solver-floored minOut meets exact tolerance, tighter does not", () => {
  // Reference solver floors minOut = quoted * (1 - 50bps).
  const floored = quote({ quotedOut: "1000000", minOut: "995000" });
  assert.equal(quoteMeetsSlippage(floored, 0.5), true);
  assert.equal(quoteMeetsSlippage(floored, 1), true);
  assert.equal(quoteMeetsSlippage(floored, 0.1), false);

  assert.equal(quoteMeetsSlippage(quote({ quotedOut: "1000000", minOut: "1000000" }), 0), true);
  // minOut above quotedOut is malformed; junk strings fail closed.
  assert.equal(quoteMeetsSlippage(quote({ quotedOut: "1000000", minOut: "1000001" }), 0.5), false);
  assert.equal(quoteMeetsSlippage(quote({ minOut: "abc" }), 0.5), false);
  assert.equal(quoteMeetsSlippage(quote({ minOut: "0" }), 0.5), false);
  assert.equal(quoteMeetsSlippage(floored, -1), false);
  assert.equal(quoteMeetsSlippage(floored, 101), false);
});
