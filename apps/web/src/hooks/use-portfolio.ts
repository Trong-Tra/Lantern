"use client";

import { useAccount, useBalance, useReadContracts } from "wagmi";
import {
  MARKET_TOKENS,
  formatUnits,
  tokenUsdPrice,
} from "@/libs/market/tokens";
import { useMarketPrices } from "./use-market";

const balanceOfAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Native AVAX rides the same HL mark as mWAVAX. */
const NATIVE = {
  symbol: "AVAX",
  name: "Avalanche (native)",
  color: "red",
  mark: "◆",
} as const;

export type PortfolioAsset = {
  symbol: string;
  name: string;
  color: string;
  mark: string;
  /** Formatted balance (trimmed decimals); null while the read is pending/failed. */
  balance: string | null;
  /** USD mark (stables $1, majors via the display feed); null when the feed is down. */
  usdPrice: number | null;
  /** balance × price; null when either side is unknown. */
  usdValue: number | null;
};

export type Portfolio = {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  /** True until the first balance batch lands. */
  isLoading: boolean;
  /** Supported assets (native + market mocks), highest value first, zeros last. */
  assets: PortfolioAsset[];
  /** Sum of known asset values; null when nothing is priced yet. */
  totalUsd: number | null;
};

/**
 * The wallet's real Fuji portfolio: native AVAX + the five market mock
 * tokens, valued with the same display feed the exchange charts use.
 */
export function usePortfolio(): Portfolio {
  const { address, isConnected } = useAccount();
  const prices = useMarketPrices();

  const native = useBalance({ address, query: { enabled: Boolean(address) } });
  const tokens = useReadContracts({
    contracts: MARKET_TOKENS.map((token) => ({
      address: token.address,
      abi: balanceOfAbi,
      functionName: "balanceOf" as const,
      args: [address ?? ("0x0000000000000000000000000000000000000000" as const)],
    })),
    query: { enabled: Boolean(address) },
  });

  const assets: PortfolioAsset[] = [];
  if (address) {
    const nativeBalance =
      native.data === undefined
        ? null
        : formatUnits(native.data.value, native.data.decimals);
    const nativeMark = prices.data?.prices?.AVAX?.usd;
    const nativePrice =
      nativeMark && Number.isFinite(nativeMark) && nativeMark > 0 ? nativeMark : null;
    assets.push({
      ...NATIVE,
      balance: nativeBalance,
      usdPrice: nativePrice,
      usdValue:
        nativeBalance !== null && nativePrice !== null
          ? Number(nativeBalance) * nativePrice
          : null,
    });

    MARKET_TOKENS.forEach((token, index) => {
      const row = tokens.data?.[index];
      const balance =
        row?.status === "success" ? formatUnits(row.result as bigint, token.decimals) : null;
      const usdPrice = tokenUsdPrice(token, prices.data?.prices);
      assets.push({
        symbol: token.symbol,
        name: token.name,
        color: token.color,
        mark: token.mark,
        balance,
        usdPrice,
        usdValue: balance !== null && usdPrice !== null ? Number(balance) * usdPrice : null,
      });
    });
  }

  const valued = assets.filter((asset) => asset.usdValue !== null && asset.usdValue > 0);
  const totalUsd = valued.length
    ? valued.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0)
    : null;

  return {
    address,
    isConnected,
    isLoading: Boolean(address) && (native.isLoading || tokens.isLoading),
    assets: assets.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0)),
    totalUsd,
  };
}
