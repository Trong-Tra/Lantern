"use client";

import { useState, type CSSProperties } from "react";
import { LatternMark } from "@/components/icons/lattern-mark";
import { ConnectWalletButton } from "@/containers/lattern/components/connect-wallet-button";
import { usePortfolio, type PortfolioAsset } from "@/hooks/use-portfolio";
import { mockTokens, mockTotal, mockHistory, mockOrders, mockPositions, mockChartValues, mockChartPath } from "./mock-data";

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

const periods = ["1D", "1W", "1M", "1Y", "All"];
const ticks: Record<string, string[]> = {
  "1D": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
  "1W": ["7 days ago", "6 days", "5 days", "4 days", "3 days", "Yesterday", "Today"],
  "1M": ["30 days ago", "25 days", "20 days", "15 days", "10 days", "5 days", "Today"],
  "1Y": ["1 year ago", "10 months", "8 months", "6 months", "4 months", "2 months", "Today"],
  All: ["Start", "", "", "", "", "", "Today"],
};

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** Donut ring colors cycle through the market palette as assets appear. */
const DONUT_COLORS = ["#e8ad35", "#22b8aa", "#a375eb", "#d49588", "#c9a66c", "#8fb3d9"];

/** Token mark hues (MARKET_TOKENS color names → hex for the asset table). */
const MARK_COLORS: Record<string, string> = {
  blue: "#7ba7d9",
  green: "#6fbf8f",
  red: "#d98a7e",
  silver: "#b9c0c9",
  amber: "#d9a75c",
};

function donutGradient(assets: PortfolioAsset[]): string {
  const valued = assets.filter((asset) => (asset.usdValue ?? 0) > 0);
  const total = valued.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0);
  let cursor = 0;
  const stops = valued.map((asset, index) => {
    const start = cursor;
    cursor += ((asset.usdValue ?? 0) / total) * 100;
    return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function Profile({ mock = false }: { mock?: boolean }) {
  return mock ? <MockProfile /> : <RealProfile />;
}

function RealProfile() {
  const [view, setView] = useState("Portfolio");
  const [assetsView, setAssetsView] = useState("Tokens");
  const [search, setSearch] = useState("");
  const portfolio = usePortfolio();
  const { isConnected, address, isLoading, assets, totalUsd } = portfolio;

  const filtered = assets.filter((asset) =>
    `${asset.symbol} ${asset.name}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const valued = assets.filter((asset) => (asset.usdValue ?? 0) > 0);

  return (
    <div className="profile-page">
      <main className="profile-main">
        <h1 className="sr-only">Wallet profile</h1>
        <div className="profile-toolbar">
          <div className="profile-identity">
            <span className="profile-avatar"><LatternMark /></span>
            <span>{address ? shortAddress(address) : "Your wallet"}</span>
          </div>
          <div className="profile-switch" aria-label="Profile view">
            {["Portfolio", "History", "Open orders"].map((item) => (
              <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>
                {item}
                {item === "Open orders" && <span className="profile-count">-</span>}
              </button>
            ))}
          </div>
        </div>
        {view === "Portfolio" ? (
          <>
            <div className="profile-overview">
              <section className="profile-card profile-worth" aria-label="Net worth">
                <div className="profile-worth-top">
                  <div>
                    <div className="profile-value">
                      {isConnected ? (totalUsd !== null ? usd(totalUsd) : "—") : "-"}
                    </div>
                    <p>Net worth · Avalanche Fuji</p>
                  </div>
                </div>
                <div
                  className="profile-plot"
                  role="img"
                  aria-label="Portfolio history is not available yet"
                >
                  <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 158 H1000 V300 H0Z" fill="#c9a66c08" />
                    <path d="M0 158 H1000" fill="none" stroke="#b69a70" strokeOpacity=".55" strokeWidth="1.5" />
                  </svg>
                  <div className="profile-axis" aria-hidden="true">
                    <span>{totalUsd !== null ? usd(totalUsd) : "—"}</span>
                    <span>{totalUsd !== null ? usd(totalUsd / 2) : "—"}</span>
                    <span>{usd(0)}</span>
                  </div>
                </div>
                <div className="profile-ticks" aria-hidden="true">
                  <span>Balance history is not indexed yet — live balances below.</span>
                </div>
              </section>
              <section className="profile-card profile-allocation" aria-label="Asset allocation">
                {valued.length > 0 ? (
                  <>
                    <div
                      className="profile-allocation-circle profile-donut"
                      style={{ "--profile-donut": donutGradient(valued) } as CSSProperties}
                    >
                      <div>
                        <strong>{totalUsd !== null ? usd(totalUsd) : "—"}</strong>
                        <span>{valued.length} asset{valued.length === 1 ? "" : "s"}</span>
                      </div>
                    </div>
                    <div className="profile-legend">
                      {valued.map((asset, index) => (
                        <div key={asset.symbol}>
                          <span>
                            <i style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                            {asset.symbol}
                          </span>
                          <span>{(((asset.usdValue ?? 0) / (totalUsd ?? 1)) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="profile-allocation-circle">No data</div>
                )}
              </section>
            </div>
            <section className="profile-card profile-assets" aria-label="Wallet assets">
              <label className="profile-asset-search">
                <input
                  type="search"
                  aria-label="Filter wallet tokens"
                  placeholder="Name or symbol"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setAssetsView("Tokens");
                  }}
                />
              </label>
              <div className="profile-asset-tabs" aria-label="Asset view">
                {["Tokens", "Positions"].map((item) => (
                  <button key={item} aria-pressed={assetsView === item} onClick={() => setAssetsView(item)}>
                    {item}
                  </button>
                ))}
              </div>
              {!isConnected ? (
                <div className="profile-empty">
                  <div className="profile-connect">
                    <p>Connect your wallet to see your Fuji balances.</p>
                    <ConnectWalletButton />
                  </div>
                </div>
              ) : assetsView === "Tokens" ? (
                <div className="profile-table-scroll">
                  <table className="profile-table">
                    <thead>
                      <tr><th>Token</th><th>Price</th><th>Balance</th><th>Value</th></tr>
                    </thead>
                    <tbody>
                      {filtered.map((asset) => (
                        <tr key={asset.symbol}>
                          <td>
                            <div className="profile-token">
                              <span
                                className="profile-token-icon"
                                style={{
                                  background: `${MARK_COLORS[asset.color] ?? "#c9a66c"}22`,
                                  color: MARK_COLORS[asset.color] ?? "#c9a66c",
                                }}
                                aria-hidden="true"
                              >
                                {asset.mark}
                              </span>
                              <div>
                                <strong>{asset.name}</strong>
                                <small>{asset.symbol}</small>
                              </div>
                            </div>
                          </td>
                          <td>{asset.usdPrice !== null ? usd(asset.usdPrice) : "—"}</td>
                          <td>
                            {asset.balance !== null
                              ? `${asset.balance} ${asset.symbol}`
                              : isLoading
                                ? "…"
                                : "—"}
                          </td>
                          <td>{asset.usdValue !== null ? usd(asset.usdValue) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && <div className="profile-empty">No matching tokens</div>}
                </div>
              ) : (
                <div className="profile-empty">No positions to display</div>
              )}
            </section>
          </>
        ) : (
          <section className="profile-card profile-activity">
            <div className="profile-empty">
              {view === "History" ? "No transaction history to display" : "No open orders to display"}
            </div>
          </section>
        )}
        <p className="profile-preview">
          Balances live on Avalanche Fuji · USD marks from the market display feed.
        </p>
      </main>
    </div>
  );
}

function MockProfile() {
  const [view, setView] = useState("Portfolio");
  const [period, setPeriod] = useState("1W");
  const [assets, setAssets] = useState("Tokens");
  const [search, setSearch] = useState("");
  const chart = mockChartPath(period);
  const start = mockChartValues[period][0];
  const change = mockTotal - start;
  const filteredTokens = mockTokens.filter((token) => `${token.symbol} ${token.name}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="profile-page">
      <main className="profile-main">
        <h1 className="sr-only">Wallet profile</h1>
        <div className="profile-toolbar">
          <div className="profile-identity"><span className="profile-avatar"><LatternMark /></span><span>Dev wallet</span></div>
          <div className="profile-switch" aria-label="Profile view">{["Portfolio", "History", "Open orders"].map((item) => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}{item === "Open orders" && <span className="profile-count">{mockOrders.length}</span>}</button>)}</div>
        </div>
        {view === "Portfolio" ? <>
          <div className="profile-overview">
            <section className="profile-card profile-worth" aria-label="Net worth">
              <div className="profile-worth-top"><div><div className="profile-value">{usd(mockTotal)} <span className="profile-positive">{`+${(change / start * 100).toFixed(2)}% (${usd(change)})`}</span></div><p>Net worth</p></div><div className="profile-periods" aria-label="Chart timeframe">{periods.map((item) => <button key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div></div>
              <div className="profile-plot" role="img" aria-label={`Mock ${period} portfolio history ending at ${usd(mockTotal)}`}><svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c9a66c" stopOpacity=".13" /><stop offset="1" stopColor="#c9a66c" stopOpacity="0" /></linearGradient></defs><path d={`${chart} L1000 300 L0 300 Z`} fill="url(#profile-fill)" /><path d={chart} fill="none" stroke="#b69a70" strokeOpacity=".55" strokeWidth="1.5" /></svg><div className="profile-axis" aria-hidden="true"><span>{usd(mockTotal)}</span><span>{usd((mockTotal + start) / 2)}</span><span>{usd(start)}</span></div></div>
              <div className="profile-ticks" aria-hidden="true">{ticks[period].map((tick, index) => <span key={index}>{tick}</span>)}</div>
            </section>
            <section className="profile-card profile-allocation" aria-label="Asset allocation"><div className="profile-allocation-circle profile-donut"><div><strong>{usd(mockTotal)}</strong><span>3 assets</span></div></div><div className="profile-legend">{mockTokens.map((token) => <div key={token.symbol}><span><i style={{ background: token.color }} />{token.symbol}</span><span>{(token.amount * token.price / mockTotal * 100).toFixed(1)}%</span></div>)}</div></section>
          </div>
          <section className="profile-card profile-assets" aria-label="Wallet assets"><label className="profile-asset-search"><input type="search" aria-label="Filter wallet tokens" placeholder="Name or symbol" value={search} onChange={(event) => { setSearch(event.target.value); setAssets("Tokens"); }} /></label><div className="profile-asset-tabs" aria-label="Asset view">{["Tokens", "Positions"].map((item) => <button key={item} aria-pressed={assets === item} onClick={() => setAssets(item)}>{item}</button>)}</div>{assets === "Tokens" ? <div className="profile-table-scroll"><table className="profile-table"><thead><tr><th>Token</th><th>Price</th><th>24h change</th><th>Balance</th><th>Value</th></tr></thead><tbody>{filteredTokens.map((token) => <tr key={token.symbol}><td><div className="profile-token"><span className="profile-token-icon" style={{ background: `${token.color}22`, color: token.color }}>{token.symbol.slice(0, 1)}</span><div><strong>{token.name}</strong><small>{token.symbol}</small></div></div></td><td>{usd(token.price)}</td><td className={token.change >= 0 ? "profile-positive" : "profile-negative"}>{token.change >= 0 ? "+" : ""}{token.change.toFixed(2)}%</td><td>{token.amount.toLocaleString("en-US")} {token.symbol}</td><td>{usd(token.amount * token.price)}</td></tr>)}</tbody></table>{!filteredTokens.length && <div className="profile-empty">No matching tokens</div>}</div> : <div className="profile-table-scroll"><table className="profile-table"><thead><tr><th>Position</th><th>Details</th><th>Value</th></tr></thead><tbody>{mockPositions.map((position) => <tr key={position.name}><td><strong>{position.name}</strong><small>{position.protocol}</small></td><td>{position.detail}</td><td>{usd(position.value)}</td></tr>)}</tbody></table><p className="profile-position-note">Separate example positions; not included in the token portfolio total.</p></div>}</section>
        </> : <section className="profile-card profile-activity"><div className="profile-table-scroll"><table className="profile-table"><thead><tr><th>Type</th><th>Amount</th><th>{view === "History" ? "Time" : "Price"}</th><th>Status</th></tr></thead><tbody>{(view === "History" ? mockHistory : mockOrders).map((item, index) => <tr key={index}><td>{item.action}</td><td>{item.detail}</td><td>{item.time}</td><td><span className="profile-status">{item.status}</span></td></tr>)}</tbody></table></div></section>}
        <p className="profile-preview">Development mock data. Fictional balances, prices and activity; unrelated to your connected wallet.</p>
      </main>
    </div>
  );
}
