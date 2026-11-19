import type { Metadata } from "next";
import { Exchange } from "./exchange";
import { MARKET_TOKENS } from "@/libs/market/tokens";
import "./exchange.css";

export const metadata: Metadata = {
  title: "Exchange | Lantern Finance",
  description: "A clearer path between assets. Explore the Lantern Finance exchange.",
};

const allowedTokens = MARKET_TOKENS.map((token) => token.symbol);

export default async function ExchangePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const initialToken = token && allowedTokens.includes(token) ? token : "mWETH";
  return <Exchange key={initialToken} initialToken={initialToken} />;
}
