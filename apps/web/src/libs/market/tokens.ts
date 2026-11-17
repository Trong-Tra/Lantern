// Fuji mock tokens the market settles with (contracts/script/seed/market.json,
// docs/contracts.md) + helpers for amounts and USD valuation. Pure module —
// no framework imports, unit-tested via tests/helpers/load-source.mjs.

export type MarketToken = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  /** Hyperliquid coin for live USD marks; null = no HL market (pegged at $1). */
  coin: string | null;
  /** CSS modifier class for the token mark (exchange.css). */
  color: string;
  /** Glyph for the token badge. */
  mark: string;
};

export const MARKET_TOKENS: readonly MarketToken[] = [
  {
    symbol: "mUSDC",
    name: "Mock USD Coin",
    address: "0xb5A7CEB3195714e81082F8A8B0F8cd7470bB72f8",
    decimals: 18,
    coin: null,
    color: "blue",
    mark: "$",
  },
  {
    symbol: "mUSDT",
    name: "Mock Tether USD",
    address: "0x173C86c27Ea43BB541b84E72076B8CA7Ff5b1e41",
    decimals: 18,
    coin: null,
    color: "green",
    mark: "₮",
  },
  {
    symbol: "mWAVAX",
    name: "Mock Wrapped AVAX",
    address: "0x6Eb204b09A36547fE21833744c8C9cC802C19B04",
    decimals: 18,
    coin: "AVAX",
    color: "red",
    mark: "◆",
  },
  {
    symbol: "mWETH",
    name: "Mock Wrapped Ether",
    address: "0x1e38cf69DA98506F14D43C82a3ca8Aa825ac8aF7",
    decimals: 18,
    coin: "ETH",
    color: "silver",
    mark: "♦",
  },
  {
    symbol: "mWBTC",
    name: "Mock Wrapped Bitcoin",
    address: "0x1638ac963dA5d466d928289852c047A9d2ad7047",
    decimals: 18,
    coin: "BTC",
    color: "amber",
    mark: "₿",
  },
] as const;

export function findToken(symbol: string): MarketToken | undefined {
  return MARKET_TOKENS.find((token) => token.symbol === symbol);
}

/** Chart/market display symbol: the HL coin (ETH/BTC/AVAX), else the Fuji ticker without the m-prefix (USDC/USDT). */
export function displaySymbol(token: MarketToken): string {
  return token.coin ?? token.symbol.replace(/^m/, "");
}

/** USD price for a token from a /market/prices payload. Stables peg at $1. */
export function tokenUsdPrice(
  token: MarketToken,
  prices: Record<string, { usd: number }> | undefined
): number | null {
  if (!token.coin) return 1;
  const entry = prices?.[token.coin];
  return entry && Number.isFinite(entry.usd) && entry.usd > 0 ? entry.usd : null;
}

/** Parse a decimal amount string into base units (18dp typical). Throws on junk. */
export function toBaseUnits(amount: string, decimals: number): bigint {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(amount.trim());
  if (!match || (!match[1] && !match[2]))
    throw new Error(`invalid amount: ${amount}`);
  const whole = match[1] || "0";
  const frac = match[2] ?? "";
  if (frac.replace(/0+$/, "").length > decimals)
    throw new Error(`too many decimal places for ${decimals}dp: ${amount}`);
  const padded = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(padded || "0");
}

/** Render base units as a decimal string (trims trailing zeros). */
export function formatUnits(value: bigint, decimals: number): string {
  const negative = value < BigInt(0);
  const abs = negative ? -value : value;
  const base = BigInt(10) ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** Render base units as a number for display math (loses precision past 2^53). */
export function unitsToNumber(value: bigint, decimals: number): number {
  return Number(formatUnits(value, decimals));
}
