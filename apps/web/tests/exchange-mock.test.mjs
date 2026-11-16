import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";

const { getMockQuote } = loadSource("src/app/exchange/mock-data.ts");
test("mock exchange converts both directions and applies fee, slippage and limit price", () => {
  const quote = getMockQuote("100", "USDC", "MON", "0.5");
  assert.ok(Math.abs(quote.received - (100 / 0.042) * 0.997) < 1e-8);
  assert.equal(quote.minimum, quote.received * 0.995);
  assert.equal(quote.fee, 0.3);
  assert.equal(
    getMockQuote("100", "MON", "USDC", "1").received,
    100 * 0.042 * 0.997
  );
  assert.equal(
    getMockQuote("100", "USDC", "MON", "0.5", "0.05").received,
    1994
  );
});
test("mock exchange rejects invalid amounts, pairs, balances and limit prices", () => {
  for (const amount of ["", ".", "0", "-1", "Infinity", "2501"])
    assert.equal(getMockQuote(amount, "USDC", "MON", "0.5"), null);
  assert.equal(getMockQuote("10", "BAD", "MON", "0.5"), null);
  assert.equal(getMockQuote("10", "MON", "MON", "0.5"), null);
  assert.equal(getMockQuote("10", "USDC", "MON", "0.5", "0"), null);
});
