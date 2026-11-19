import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./helpers/load-source.mjs";
const { MARKET_TOKENS, findToken, displaySymbol, tokenUsdPrice, toBaseUnits, formatUnits, unitsToNumber } =
  loadSource("src/libs/market/tokens.ts");

test("display symbols drop the Fuji m-prefix — chart shows ETH/BTC/AVAX/USDC/USDT", () => {
  assert.equal(displaySymbol(findToken("mWETH")), "ETH");
  assert.equal(displaySymbol(findToken("mWBTC")), "BTC");
  assert.equal(displaySymbol(findToken("mWAVAX")), "AVAX");
  assert.equal(displaySymbol(findToken("mUSDC")), "USDC");
  assert.equal(displaySymbol(findToken("mUSDT")), "USDT");
});

test("registry holds the five Fuji mock tokens with live-valuation coins", () => {
  assert.equal(MARKET_TOKENS.length, 5);
  for (const token of MARKET_TOKENS) {
    assert.match(token.address, /^0x[0-9a-fA-F]{40}$/);
    assert.equal(token.decimals, 18);
    assert.ok(token.symbol.startsWith("m"));
    assert.ok(token.name.length > 0);
    assert.ok(token.color && token.mark);
  }
  // Stables have no Hyperliquid market (pegged); majors map to HL coins.
  assert.equal(findToken("mUSDC").coin, null);
  assert.equal(findToken("mUSDT").coin, null);
  assert.equal(findToken("mWAVAX").coin, "AVAX");
  assert.equal(findToken("mWETH").coin, "ETH");
  assert.equal(findToken("mWBTC").coin, "BTC");
  assert.equal(findToken("MON"), undefined);
});

test("USD valuation: majors from the feed, stables at the $1 peg", () => {
  const prices = { ETH: { usd: 3000 }, BTC: { usd: 60000 } };
  assert.equal(tokenUsdPrice(findToken("mWETH"), prices), 3000);
  assert.equal(tokenUsdPrice(findToken("mWBTC"), prices), 60000);
  assert.equal(tokenUsdPrice(findToken("mUSDC"), prices), 1);
  assert.equal(tokenUsdPrice(findToken("mUSDC"), undefined), 1);
  // Missing or junk feed entries value to null — the UI shows "—", never a guess.
  assert.equal(tokenUsdPrice(findToken("mWAVAX"), prices), null);
  assert.equal(tokenUsdPrice(findToken("mWETH"), { ETH: { usd: 0 } }), null);
  assert.equal(tokenUsdPrice(findToken("mWETH"), { ETH: { usd: NaN } }), null);
});

test("toBaseUnits parses decimal strings to exact 18dp integers", () => {
  assert.equal(toBaseUnits("1", 18), 10n ** 18n);
  assert.equal(toBaseUnits("0.5", 18), 5n * 10n ** 17n);
  assert.equal(toBaseUnits("1.000000000000000001", 18), 10n ** 18n + 1n);
  assert.equal(toBaseUnits(".25", 18), 25n * 10n ** 16n);
  assert.equal(toBaseUnits("0", 18), 0n);
  assert.equal(toBaseUnits("123", 6), 123n * 10n ** 6n);
  assert.throws(() => toBaseUnits("1.1234567890123456789", 18)); // 19dp
  assert.throws(() => toBaseUnits("abc", 18));
  assert.throws(() => toBaseUnits("", 18));
  assert.throws(() => toBaseUnits(".", 18));
  assert.throws(() => toBaseUnits("-1", 18));
});

test("formatUnits renders trimmed decimals and round-trips", () => {
  assert.equal(formatUnits(10n ** 18n, 18), "1");
  assert.equal(formatUnits(15n * 10n ** 17n, 18), "1.5");
  assert.equal(formatUnits(0n, 18), "0");
  assert.equal(formatUnits(-25n * 10n ** 16n, 18), "-0.25");
  assert.equal(formatUnits(1n, 18), "0.000000000000000001");
  // Round-trip: parse → render is lossless for canonical inputs.
  for (const raw of ["1", "0.5", "123.456", "0.000000000000000001", "1000000"]) {
    assert.equal(formatUnits(toBaseUnits(raw, 18), 18), raw);
  }
  assert.equal(unitsToNumber(15n * 10n ** 17n, 18), 1.5);
});
