"use client";

import { useEffect, useState } from "react";
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
import { ConnectWalletButton } from "@/containers/lattern/components/connect-wallet-button";
import { getMockQuote, mockAssets } from "./mock-data";
import { ParticleBackground } from "./particle-background";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/loading-skeleton";
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

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 6 });
const formatUsd = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  });

const tokens = [
  { symbol: "MON", name: "Monad", mark: "◈", color: "violet" },
  { symbol: "USDC", name: "USD Coin", mark: "$", color: "blue" },
  { symbol: "ETH", name: "Ethereum", mark: "♦", color: "silver" },
];

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
        {symbol === "MON" ? (
          <rect x="5" y="5" width="14" height="14" rx="5" transform="rotate(-35 12 12)" stroke="currentColor" strokeWidth="2.8" />
        ) : symbol === "ETH" ? (
          <>
            <path d="m12 2 6 10-6 3.5L6 12Z" fill="currentColor" />
            <path d="m6 14 6 8 6-8-6 3.5Z" fill="currentColor" opacity=".6" />
            <path d="M12 2v13.5L6 12Z" fill="black" opacity=".18" />
          </>
        ) : (
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M7 4a9 9 0 0 0 0 16M17 4a9 9 0 0 1 0 16M12 5v14M15 8H10.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H9" />
          </g>
        )}
      </svg>
    </span>
  );
}

export function Exchange({
  mock = false,
  initialToken = "MON",
}: {
  mock?: boolean;
  initialToken?: string;
}) {
  const [sell, setSell] = useState(initialToken === "USDC" ? "MON" : "USDC");
  const [buy, setBuy] = useState(initialToken);
  const [amount, setAmount] = useState(mock ? "100" : "");
  const [slippage, setSlippage] = useState("0.5");
  const [limit, setLimit] = useState("");
  const [mode, setMode] = useState("Swap");
  const [settings, setSettings] = useState(false);
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState<"sell" | "buy" | null>(null);
  const token = tokens.find((item) => item.symbol === buy)!;
  const quote =
    mock && (mode !== "Limit" || limit !== "")
      ? getMockQuote(amount, sell, buy, slippage, mode === "Limit" ? limit : "")
      : null;
  const insufficient = mock && Number(amount) > mockAssets[sell].balance;

  function selectToken(symbol: string) {
    if (picker === "sell") {
      if (symbol === buy) setBuy(sell);
      setSell(symbol);
    } else {
      if (symbol === sell) setSell(buy);
      setBuy(symbol);
    }
    setPicker(null);
    setSearch("");
    setLimit("");
  }

  function renderTokenPicker(side: "sell" | "buy", symbol: string) {
    const asset = tokens.find((item) => item.symbol === symbol)!;
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
            {tokens
              .filter((item) =>
                `${item.name} ${item.symbol}`
                  .toLowerCase()
                  .includes(search.toLowerCase())
              )
              .map((item) => (
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
            {!tokens.some((item) =>
              `${item.name} ${item.symbol}`
                .toLowerCase()
                .includes(search.toLowerCase())
            ) && <p>No tokens found.</p>}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <div className="exchange-page">
      <ParticleBackground />

      <main className="exchange-main">
        <div className="exchange-focus">
          <div className="exchange-intro">
            <p>THE EXCHANGE</p>
            <ExchangeHeadline />
            <span>A clearer path between assets, on Monad.</span>
          </div>
          <div className="exchange-workspace">
            <MarketChart
              token={token}
              mock={mock}
              pairedToken={sell}
              onSwitch={() => {
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
                <button className="exchange-icon-button" aria-label="Refresh quote" disabled title="Live quotes are not connected"><ArrowPathIcon /></button>
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
                    {mock
                      ? "Applied to the mock minimum received."
                      : "Applies when live trading is available."}
                  </span>
                </div>
              )}
              {(["sell", "buy"] as const).map((side) => {
                const symbol = side === "sell" ? sell : buy;
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
                        <span className="exchange-chain"><SwapTokenIcon symbol="MON" color="violet" />Monad Testnet</span>
                      </div>
                      <div className="exchange-token-row">
                        <div className="exchange-token-controls">
                          {renderTokenPicker(side, symbol)}
                        </div>
                        {side === "sell" && (
                          <div className="exchange-quick-amounts">
                            <button disabled={!mock} onClick={() => setAmount(String(mockAssets[sell].balance / 2))}>50%</button>
                            <button disabled={!mock} onClick={() => setAmount(String(mockAssets[sell].balance))}>Max</button>
                          </div>
                        )}
                      </div>
                      <div className="exchange-amount-row">
                        {side === "sell" ? (
                          <input id="exchange-amount" aria-label="Sell amount" inputMode="decimal" autoComplete="off" placeholder="0.0" value={amount} onChange={(event) => {
                            if (/^\d*\.?\d*$/.test(event.target.value)) setAmount(event.target.value);
                          }} />
                        ) : (
                          <span className="exchange-output" aria-label="Buy amount" aria-live="polite">{quote ? formatAmount(quote.received) : "0.0"}</span>
                        )}
                        <span className="exchange-fiat">{mock ? formatUsd(side === "sell" ? (Number(amount) || 0) * mockAssets[sell].price : (quote?.received || 0) * mockAssets[buy].price) : "$0.00"}</span>
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
                </label>
              )}
              {mode === "Advanced" && (
                <div className="exchange-advanced">
                  <span>
                    Network <b>Monad Testnet</b>
                  </span>
                  <span>
                    Route{" "}
                    <b>{mock ? `${sell} → ${buy} (mock)` : "Not quoted"}</b>
                  </span>
                  <span>
                    Network fee <b>{mock ? "$0.002 (mock)" : "-"}</b>
                  </span>
                </div>
              )}
              <div className="exchange-swap-bottom">
                <ConnectWalletButton />
                {mock && (insufficient || !quote) && <p className="exchange-preview-status" role="status">{insufficient ? "Insufficient mock balance" : "Development preview · Enter an amount for a mock quote"}</p>}
                {!mock && <p>Preview only · Live quotes and execution coming soon.</p>}
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

