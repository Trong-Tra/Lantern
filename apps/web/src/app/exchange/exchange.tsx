"use client";

import { useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import {
  ArrowDownIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowUpRightIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "@/containers/lattern/components/connect-wallet-button";
import { ParticleBackground } from "./particle-background";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/loading-skeleton";
import { MARKET_TOKENS, findToken, formatUnits, tokenUsdPrice, type MarketToken } from "@/libs/market/tokens";
import { quoteMeetsSlippage, type QuoteBody, type SignedQuote } from "@/libs/market/quote-ws";
import { useQuoteStream } from "@/hooks/use-quote-stream";
import { useMarketGraph, useMarketPrices } from "@/hooks/use-market";
import { QuoteRouteFlow } from "./quote-routes";
import { QuoteStreamList } from "./quote-list";
const MarketChart = dynamic(
  () => import("./market-chart").then((module) => module.MarketChart),
  {
    loading: () => (
      <div role="status" aria-label="Loading price chart">
        <Skeleton className="loading-visual" />
      </div>
    ),
  }
);

const formatUsd = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  });

const headlines = [
  ["Value moves.", "Light guides."],
  ["New horizons.", "Clearer paths."],
  ["Assets flow.", "Possibility grows."],
  ["Find your path.", "Follow the light."],
];

function ExchangeHeadline() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (!reduced.matches && !document.hidden)
        setActive((current) => (current + 1) % headlines.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <h1 className="exchange-headline" aria-label="Value moves. Light guides.">
      {headlines.map(([lead, accent], index) => (
        <span key={lead} aria-hidden="true" data-active={active === index}>
          {lead} <em>{accent}</em>
        </span>
      ))}
    </h1>
  );
}

function SwapTokenIcon({ symbol, color }: { symbol: string; color: string }) {
  return (
    <span className={`token-mark ${color}`} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        {symbol === "mWETH" ? (
          <>
            <path d="m12 2 6 10-6 3.5L6 12Z" fill="currentColor" />
            <path d="m6 14 6 8 6-8-6 3.5Z" fill="currentColor" opacity=".6" />
            <path d="M12 2v13.5L6 12Z" fill="black" opacity=".18" />
          </>
        ) : symbol === "mWBTC" ? (
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5v14M12.5 5v14M8 8h5.2a3 3 0 0 1 0 6H8m0 0h5.6a3 3 0 0 1 0 6H8" />
          </g>
        ) : symbol === "mWAVAX" ? (
          <path d="M12 4 19 12l-7 8-7-8Z" stroke="currentColor" strokeWidth="2" fill="none" />
        ) : (
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M7 4a9 9 0 0 0 0 16M17 4a9 9 0 0 1 0 16M12 5v14M15 8H10.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H9" />
          </g>
        )}
      </svg>
    </span>
  );
}

function sortedByOutput(quotes: SignedQuote[]): SignedQuote[] {
  return [...quotes].sort((a, b) => {
    try {
      const left = BigInt(a.quote.quotedOut);
      const right = BigInt(b.quote.quotedOut);
      return left === right ? 0 : left > right ? -1 : 1;
    } catch {
      return 0;
    }
  });
}

function formatRoutes(routes: QuoteBody["routes"]): string {
  if (!routes.length) return "—";
  return routes
    .map((route) => `${(route.bps / 100).toFixed(0)}% · ${route.pools.length} pool${route.pools.length === 1 ? "" : "s"}`)
    .join(" + ");
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Base-unit decimal string → display; malformed server data shows 0, never crashes. */
function safeUnits(value: string, decimals: number): string {
  try {
    return formatUnits(BigInt(value), decimals);
  } catch {
    return "0";
  }
}

// Wallet address lives behind wagmi; the chain ships a public Fuji RPC
// default, so the wallet path is always used.
export function Exchange({ initialToken = "mWETH" }: { initialToken?: string }) {
  return <ExchangeWithWallet initialToken={initialToken} />;
}

function ExchangeWithWallet({ initialToken }: { initialToken: string }) {
  const { address } = useAccount();
  return <ExchangeView address={address ?? null} initialToken={initialToken} />;
}

function ExchangeView({ address, initialToken }: { address: string | null; initialToken: string }) {
  const [sell, setSell] = useState(initialToken === "mUSDC" ? "mUSDT" : "mUSDC");
  const [buy, setBuy] = useState(initialToken);
  const [chartSymbol, setChartSymbol] = useState(initialToken);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [limit, setLimit] = useState("");
  const [mode, setMode] = useState("Swap");
  const [settings, setSettings] = useState(false);
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState<"sell" | "buy" | null>(null);
  // Which agent quote has its route breakdown open (one at a time).
  const [openRouteId, setOpenRouteId] = useState<string | null>(null);

  const sellToken = findToken(sell);
  const buyToken = findToken(buy);
  const prices = useMarketPrices();
  const graph = useMarketGraph();

  const sellUsd = sellToken ? tokenUsdPrice(sellToken, prices.data?.prices) : null;
  const buyUsd = buyToken ? tokenUsdPrice(buyToken, prices.data?.prices) : null;

  const amountValid = /^\d*\.?\d+$/.test(amount) && Number(amount) > 0 && sell !== buy;
  const intentRequest =
    address && mode !== "Limit" && amountValid && sellToken && buyToken
      ? {
          user: address,
          tokenIn: sellToken.address,
          tokenOut: buyToken.address,
          amountIn: amount,
        }
      : null;
  const { state: quoteState, pick, reopen } = useQuoteStream(intentRequest);

  const slippagePct = Number(slippage);
  const rawQuotes = Object.values(quoteState.quotes);
  const visibleQuotes = sortedByOutput(
    rawQuotes.filter((entry) => quoteMeetsSlippage(entry.quote, slippagePct))
  );
  const best = visibleQuotes[0] ?? null;
  const picked = quoteState.picked;

  const receivedUnits = picked
    ? safeUnits(picked.quote.quotedOut, buyToken?.decimals ?? 18)
    : best
      ? safeUnits(best.quote.quotedOut, buyToken?.decimals ?? 18)
      : null;
  const received = receivedUnits !== null ? Number(receivedUnits) : 0;

  const baseSymbol = (symbol: string) => symbol.replace(/^m/, "");
  const matchedPools = useMemo(() => {
    if (mode !== "Advanced" || !sellToken || !buyToken) return [];
    const wanted = new Set([baseSymbol(sell), baseSymbol(buy)]);
    return (graph.data?.pools ?? []).filter(
      (pool) => wanted.has(pool.token0.symbol) && wanted.has(pool.token1.symbol)
    );
  }, [mode, graph.data, sell, buy, sellToken, buyToken]);

  function statusText(): string {
    if (!address) return "Connect a wallet to stream quotes.";
    if (mode === "Limit") return "Limit orders are not quoted live yet.";
    if (!amountValid) return "Enter an amount to stream quotes.";
    if (picked) return "Quote selected.";
    if (quoteState.closed === "disconnected")
      return "Reconnecting to the quote stream…";
    if (quoteState.closed) return "Intent closed — enter an amount to quote again.";
    if (quoteState.error) return quoteState.error;
    if (quoteState.awaitingIntent || !quoteState.intentId)
      return "Opening intent…";
    if (!rawQuotes.length) return "Waiting for solver quotes…";
    if (!visibleQuotes.length)
      return `${rawQuotes.length} quote${rawQuotes.length === 1 ? "" : "s"} in — none meet your ${slippage}% slippage.`;
    return `${visibleQuotes.length} quote${visibleQuotes.length === 1 ? "" : "s"} in · best ${receivedUnits ?? "0"} ${buy}`;
  }

  function selectToken(symbol: string) {
    if (picker === "sell") {
      if (symbol === buy) setBuy(sell);
      setSell(symbol);
    } else {
      if (symbol === sell) setSell(buy);
      setBuy(symbol);
    }
    setChartSymbol(symbol);
    setPicker(null);
    setSearch("");
    setLimit("");
  }

  function renderTokenPicker(side: "sell" | "buy", symbol: string) {
    const asset = findToken(symbol)!;
    return (
      <Popover.Root open={picker === side} onOpenChange={(open) => { setPicker(open ? side : null); setSearch(""); }}>
        <Popover.Trigger asChild>
          <button aria-label={`Select ${side} token, ${symbol}`}>
            <SwapTokenIcon symbol={asset.symbol} color={asset.color} />
            {symbol}
            <ChevronDownIcon className="exchange-token-chevron" aria-hidden="true" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="exchange-picker"
            side={side === "buy" ? "top" : "bottom"}
            align="end"
            sideOffset={8}
            avoidCollisions={false}
            aria-label={`Select ${side} token`}
          >
            <div>
              <h2>
                Select {side === "sell" ? "sell" : "buy"} token
              </h2>
              <button
                onClick={() => setPicker(null)}
                aria-label="Close token selection"
              >
                <XMarkIcon width={18} height={18} />
              </button>
            </div>
            <label>
              <MagnifyingGlassIcon />
              <input
                autoFocus
                aria-label="Search tokens"
                placeholder="Search tokens"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {MARKET_TOKENS.filter((item) =>
              `${item.name} ${item.symbol}`
                .toLowerCase()
                .includes(search.toLowerCase())
            ).map((item) => (
              <button
                className="exchange-token-option"
                key={item.symbol}
                onClick={() => selectToken(item.symbol)}
              >
                <SwapTokenIcon symbol={item.symbol} color={item.color} />
                <span>
                  {item.symbol}
                  <small>{item.name}</small>
                </span>
              </button>
            ))}
            {!MARKET_TOKENS.some((item) =>
              `${item.name} ${item.symbol}`
                .toLowerCase()
                .includes(search.toLowerCase())
            ) && <p>No tokens found.</p>}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  const token: MarketToken = findToken(chartSymbol) ?? buyToken ?? findToken("mWETH")!;

  return (
    <div className="exchange-page">
      <ParticleBackground />

      <main className="exchange-main">
        <div className="exchange-focus">
          <div className="exchange-intro">
            <p>THE EXCHANGE</p>
            <ExchangeHeadline />
            <span>A clearer path between assets, on Avalanche Fuji.</span>
          </div>
          <div className="exchange-workspace">
            <MarketChart
              token={token}
              pairedToken={sell}
              onSwitch={() => {
                setChartSymbol(sell);
                setSell(buy);
                setBuy(sell);
                setAmount("");
                setLimit("");
              }}
            />

            <section className="exchange-swap matcha-swap" data-mode={mode} aria-label="Trade assets">
              <div className="exchange-swap-top">
                <div className="exchange-modes" aria-label="Order type">
                  {["Swap", "Limit", "Advanced"].map((item) => (
                    <button
                      key={item}
                      aria-pressed={mode === item}
                      onClick={() => setMode(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="exchange-panel-tools">
                <button
                  className="exchange-icon-button"
                  aria-label="Refresh quote"
                  disabled={!intentRequest || Boolean(picked)}
                  title={intentRequest ? "Reopen the quote stream" : "Enter an amount to stream quotes"}
                  onClick={reopen}
                ><ArrowPathIcon /></button>
                <button
                  className="exchange-icon-button"
                  aria-label="Trade settings"
                  aria-expanded={settings}
                  onClick={() => setSettings(!settings)}
                >
                  <Cog6ToothIcon />
                </button>
                </div>
              </div>
              {settings && (
                <div className="exchange-settings">
                  <label>
                    Slippage tolerance
                    <select
                      value={slippage}
                      onChange={(event) => setSlippage(event.target.value)}
                    >
                      <option value="0.1">0.1%</option>
                      <option value="0.5">0.5%</option>
                      <option value="1">1%</option>
                    </select>
                  </label>
                  <span>
                    Hides quotes whose minimum received falls below this tolerance.
                    Solvers set their own minimum.
                  </span>
                </div>
              )}
              {(["sell", "buy"] as const).map((side) => {
                const symbol = side === "sell" ? sell : buy;
                const usd = side === "sell" ? sellUsd : buyUsd;
                return (
                  <div key={side} className="exchange-trade-section">
                    {side === "buy" && (
                      <div className="exchange-direction">
                        <button aria-label="Reverse token pair" onClick={() => {
                          setSell(buy); setBuy(sell); setAmount(""); setLimit("");
                        }}><ArrowDownIcon /></button>
                      </div>
                    )}
                    <div className="exchange-trade-field">
                      <div className="exchange-field-label">
                        <label htmlFor={side === "sell" ? "exchange-amount" : undefined}>{side === "sell" ? "From" : "To"}</label>
                        <span className="exchange-chain"><SwapTokenIcon symbol="mWAVAX" color="red" />Avalanche Fuji</span>
                      </div>
                      <div className="exchange-token-row">
                        <div className="exchange-token-controls">
                          {renderTokenPicker(side, symbol)}
                        </div>
                      </div>
                      <div className="exchange-amount-row">
                        {side === "sell" ? (
                          <input id="exchange-amount" aria-label="Sell amount" inputMode="decimal" autoComplete="off" placeholder="0.0" value={amount} onChange={(event) => {
                            if (/^\d*\.?\d*$/.test(event.target.value)) setAmount(event.target.value);
                          }} />
                        ) : (
                          <span className="exchange-output" aria-label="Buy amount" aria-live="polite">{receivedUnits ?? "0.0"}</span>
                        )}
                        <span className="exchange-fiat">
                          {usd === null
                            ? "—"
                            : side === "sell"
                              ? formatUsd((Number(amount) || 0) * usd)
                              : formatUsd(received * usd)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {mode === "Limit" && (
                <label className="exchange-limit">
                  Limit price ({sell} per {buy})
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Enter target price"
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                  />
                  <span>Limit orders are not quoted live yet — use Swap for streaming solver quotes.</span>
                </label>
              )}
              {mode === "Advanced" && (
                <div className="exchange-advanced">
                  <span>
                    Network <b>Avalanche Fuji</b>
                  </span>
                  <span>
                    Best route{" "}
                    <b>{best ? formatRoutes(best.quote.routes) : "No quotes yet"}</b>
                  </span>
                  <span>
                    Solver fee <b>20 bps</b>
                  </span>
                  {matchedPools.length > 0 && (
                    <div className="exchange-graph-pools" aria-label="Live pools for this pair">
                      <p>Live pools · real-DEX graph feed</p>
                      {matchedPools.map((pool) => (
                        <div className="exchange-pool-row" key={pool.address}>
                          <span>{pool.pair}</span>
                          <small>{pool.chain}</small>
                          <b>
                            {safeUnits(pool.reserve0, pool.token0.decimals)} {pool.token0.symbol}
                            {" / "}
                            {safeUnits(pool.reserve1, pool.token1.decimals)} {pool.token1.symbol}
                          </b>
                          <code title={pool.address}>{shortAddress(pool.address)}</code>
                        </div>
                      ))}
                    </div>
                  )}
                  {graph.isError && (
                    <span>Graph feed unreachable — is the market service running?</span>
                  )}
                </div>
              )}
              {mode === "Swap" && !quoteState.closed && !picked && visibleQuotes.length > 0 && (
                <QuoteStreamList
                  quotes={visibleQuotes}
                  buySymbol={buy}
                  buyDecimals={buyToken?.decimals ?? 18}
                  openRouteId={openRouteId}
                  onToggleRoute={(quoteId) =>
                    setOpenRouteId((current) => (current === quoteId ? null : quoteId))
                  }
                  onPick={pick}
                />
              )}
              {mode === "Swap" && picked && (
                <div className="exchange-quote-list exchange-quote-picked" aria-label="Selected quote">
                  <p>Quote selected · agent {picked.quote.agentId}</p>
                  <div className="exchange-quote-line">
                    <span className="exchange-quote-agent">
                      <i className="exchange-quote-dot" aria-hidden="true" />
                      Picked
                    </span>
                    <span className="exchange-quote-values">
                      <b>
                        {safeUnits(picked.quote.quotedOut, buyToken?.decimals ?? 18)} {buy}
                      </b>
                      <small>
                        min {safeUnits(picked.quote.minOut, buyToken?.decimals ?? 18)}
                      </small>
                    </span>
                    <code title={picked.signature}>{shortAddress(picked.signature)}</code>
                  </div>
                  <QuoteRouteFlow quote={picked.quote} />
                </div>
              )}
              <div className="exchange-swap-bottom">
                <ConnectWalletButton />
                <p className="exchange-preview-status" role="status">{statusText()}</p>
              </div>
            </section>
          </div>
        </div>
        <div className="exchange-principles">
          {[
            {
              n: "I",
              title: "A direct path",
              text: "Less friction between you and your next move.",
            },
            {
              n: "II",
              title: "Clarity before action",
              text: "Know the asset. Understand the route.",
            },
            {
              n: "III",
              title: "Your keys. Your light.",
              text: "Stay in control, every step of the way.",
            },
          ].map((item) => (
            <div key={item.n}>
              <span>{item.n}</span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
        <footer className="exchange-footer">
          <span>
            LATTERN <span>·</span> Illuminate the agent economy.
          </span>
          <Link href="/network">
            Explore the network <ArrowUpRightIcon />
          </Link>
        </footer>
      </main>


    </div>
  );
}
