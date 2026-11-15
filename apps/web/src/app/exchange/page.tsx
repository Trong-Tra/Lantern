import type { Metadata } from "next";
import { Exchange } from "./exchange";
import "./exchange.css";

export const metadata: Metadata = {
  title: "Exchange | Lattern",
  description: "A clearer path between assets. Explore the Lattern exchange.",
};

export default async function ExchangePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const initialToken = token && ["MON", "USDC", "ETH"].includes(token) ? token : "MON";
  return <Exchange key={initialToken} initialToken={initialToken} mock={process.env.NODE_ENV === "development"} />;
}
