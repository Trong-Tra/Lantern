"use client";

import { useState } from "react";
import { LatternMark } from "@/components/icons/lattern-mark";
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

export function Profile({ mock = false }: { mock?: boolean }) {
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
          <div className="profile-identity"><span className="profile-avatar"><LatternMark /></span><span>{mock ? "Dev wallet" : "Your wallet"}</span></div>
          <div className="profile-switch" aria-label="Profile view">{["Portfolio", "History", "Open orders"].map((item) => <button key={item} aria-pressed={view === item} onClick={() => setView(item)}>{item}{item === "Open orders" && <span className="profile-count">{mock ? mockOrders.length : "-"}</span>}</button>)}</div>
        </div>
        {view === "Portfolio" ? <>
          <div className="profile-overview">
            <section className="profile-card profile-worth" aria-label="Net worth">
              <div className="profile-worth-top"><div><div className="profile-value">{mock ? usd(mockTotal) : "-"} <span className={mock ? "profile-positive" : undefined}>{mock ? `+${(change / start * 100).toFixed(2)}% (${usd(change)})` : "-% (-)"}</span></div><p>Net worth</p></div><div className="profile-periods" aria-label="Chart timeframe">{periods.map((item) => <button key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div></div>
              <div className="profile-plot" role="img" aria-label={mock ? `Mock ${period} portfolio history ending at ${usd(mockTotal)}` : "Portfolio chart unavailable"}><svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c9a66c" stopOpacity=".13" /><stop offset="1" stopColor="#c9a66c" stopOpacity="0" /></linearGradient></defs><path d={mock ? `${chart} L1000 300 L0 300 Z` : "M0 158 H1000 V300 H0Z"} fill="url(#profile-fill)" /><path d={mock ? chart : "M0 158 H1000"} fill="none" stroke="#b69a70" strokeOpacity=".55" strokeWidth="1.5" /></svg><div className="profile-axis" aria-hidden="true"><span>{mock ? usd(mockTotal) : "-"}</span><span>{mock ? usd((mockTotal + start) / 2) : "-"}</span><span>{mock ? usd(start) : "-"}</span></div></div>
              <div className="profile-ticks" aria-hidden="true">{ticks[period].map((tick, index) => <span key={index}>{tick}</span>)}</div>
            </section>
            <section className="profile-card profile-allocation" aria-label="Asset allocation"><div className={`profile-allocation-circle ${mock ? "profile-donut" : ""}`}>{mock ? <div><strong>{usd(mockTotal)}</strong><span>3 assets</span></div> : "No data"}</div>{mock && <div className="profile-legend">{mockTokens.map((token) => <div key={token.symbol}><span><i style={{ background: token.color }} />{token.symbol}</span><span>{(token.amount * token.price / mockTotal * 100).toFixed(1)}%</span></div>)}</div>}</section>
          </div>
          <section className="profile-card profile-assets" aria-label="Wallet assets"><label className="profile-asset-search"><input type="search" aria-label="Filter wallet tokens" placeholder="Name or symbol" value={search} onChange={(event) => { setSearch(event.target.value); setAssets("Tokens"); }} /></label><div className="profile-asset-tabs" aria-label="Asset view">{["Tokens", "Positions"].map((item) => <button key={item} aria-pressed={assets === item} onClick={() => setAssets(item)}>{item}</button>)}</div>{mock ? assets === "Tokens" ? <div className="profile-table-scroll"><table className="profile-table"><thead><tr><th>Token</th><th>Price</th><th>24h change</th><th>Balance</th><th>Value</th></tr></thead><tbody>{filteredTokens.map((token) => <tr key={token.symbol}><td><div className="profile-token"><span className="profile-token-icon" style={{ background: `${token.color}22`, color: token.color }}>{token.symbol.slice(0, 1)}</span><div><strong>{token.name}</strong><small>{token.symbol}</small></div></div></td><td>{usd(token.price)}</td><td className={token.change >= 0 ? "profile-positive" : "profile-negative"}>{token.change >= 0 ? "+" : ""}{token.change.toFixed(2)}%</td><td>{token.amount.toLocaleString("en-US")} {token.symbol}</td><td>{usd(token.amount * token.price)}</td></tr>)}</tbody></table>{!filteredTokens.length && <div className="profile-empty">No matching tokens</div>}</div> : <div className="profile-table-scroll"><table className="profile-table"><thead><tr><th>Position</th><th>Details</th><th>Value</th></tr></thead><tbody>{mockPositions.map((position) => <tr key={position.name}><td><strong>{position.name}</strong><small>{position.protocol}</small></td><td>{position.detail}</td><td>{usd(position.value)}</td></tr>)}</tbody></table><p className="profile-position-note">Separate example positions; not included in the token portfolio total.</p></div> : <div className="profile-empty">{search ? "No matching tokens" : assets === "Tokens" ? "No tokens to display. Connect your wallet to get started." : "No positions to display"}</div>}</section>
        </> : <section className="profile-card profile-activity">{mock ? <div className="profile-table-scroll"><table className="profile-table"><thead><tr><th>Type</th><th>Amount</th><th>{view === "History" ? "Time" : "Price"}</th><th>Status</th></tr></thead><tbody>{(view === "History" ? mockHistory : mockOrders).map((item, index) => <tr key={index}><td>{item.action}</td><td>{item.detail}</td><td>{item.time}</td><td><span className="profile-status">{item.status}</span></td></tr>)}</tbody></table></div> : <div className="profile-empty">{view === "History" ? "No transaction history to display" : "No open orders to display"}</div>}</section>}
        <p className="profile-preview">{mock ? "Development mock data. Fictional balances, prices and activity; unrelated to your connected wallet." : "UI preview. Portfolio data is not connected yet."}</p>
      </main>
    </div>
  );
}




