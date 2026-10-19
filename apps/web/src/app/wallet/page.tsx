"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, type Address } from "viem";
import Link from "next/link";
import { monadTestnet } from "@/libs/chain";
import { getMonadExplorerUrl } from "@lantern/config";
import { SiteHeader } from "@/components/organisms/site-header";
import { NoticeCard } from "@/components/molecules";

const STORAGE_KEY = "lantern.agentWallet.v1";
const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "";
const POOL_ADDRESS = (process.env.NEXT_PUBLIC_DEMO_FX_POOL_ADDRESS ||
  "0xC8929Caaa4370B756c927E4b99883eb5FBED77cd") as Address;

const poolAbi = [
  {
    type: "function",
    name: "usdc",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cny",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sgd",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

type Assets = { mon: bigint; cny: bigint; usd: bigint; sgd: bigint } | null;

function loadAgentAddress(): Address | null {
  if (typeof window === "undefined") return null;
  const key = window.localStorage.getItem(STORAGE_KEY) as `0x${string}` | null;
  if (!key) return null;
  try {
    return privateKeyToAccount(key).address;
  } catch {
    return null;
  }
}

/** Shows the agent wallet (separate, permanent key) and its live assets. */
export default function WalletPage() {
  const [address, setAddress] = useState<Address | null>(null);
  const [assets, setAssets] = useState<Assets>(null);
  const [copied, setCopied] = useState(false);

  const publicClient = useMemo(
    () => createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) }),
    [],
  );

  // Hydration-safe restore: load the permanent agent wallet address (never regenerated).
  useEffect(() => {
    const restore = setTimeout(() => setAddress(loadAgentAddress()), 0);
    return () => clearTimeout(restore);
  }, []);

  const refresh = useMemo(
    () => async () => {
      if (!address) return;
      const [mon, tokens] = await Promise.all([
        publicClient.getBalance({ address }),
        (async () => {
          const [cnyAddr, usdAddr, sgdAddr] = await Promise.all([
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: poolAbi,
              functionName: "cny",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: poolAbi,
              functionName: "usdc",
            }),
            publicClient.readContract({
              address: POOL_ADDRESS,
              abi: poolAbi,
              functionName: "sgd",
            }),
          ]);
          const [cny, usd, sgd] = await Promise.all(
            [cnyAddr, usdAddr, sgdAddr].map((token) =>
              publicClient.readContract({
                address: token,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address],
              }),
            ),
          );
          return { cny, usd, sgd };
        })(),
      ]);
      setAssets({ mon, cny: tokens.cny, usd: tokens.usd, sgd: tokens.sgd });
    },
    [address, publicClient],
  );

  useEffect(() => {
    if (!address) return;
    const kick = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 5_000);
    return () => {
      clearTimeout(kick);
      clearInterval(timer);
    };
  }, [address, refresh]);

  const copyAddress = () => {
    if (!address) return;
    void navigator.clipboard?.writeText(address).then(() => {
      setCopied(true);
      const reset = setTimeout(() => setCopied(false), 1_500);
      return () => clearTimeout(reset);
    });
  };

  return (
    <main className="relative mx-auto w-full max-w-3xl overflow-x-clip px-6 pt-36 pb-12">
      <SiteHeader active="wallet" />
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-lantern/80">Wallet</p>
      <h1 className="mt-3 font-syne text-4xl leading-tight text-paper">Your agent&apos;s funds</h1>

      {!RPC_URL ? (
        <div className="mt-6">
          <NoticeCard title="Wallet view disabled">
            Set <code className="font-mono text-lantern">NEXT_PUBLIC_MONAD_RPC_URL</code> in{" "}
            <code className="font-mono text-lantern">apps/web/.env</code>.
          </NoticeCard>
        </div>
      ) : !address ? (
        <div className="mt-6">
          <NoticeCard title="No agent wallet yet">
            Create your agent wallet on the agent profile page — it&apos;s generated once and held
            permanently (never recreated), so your funds are never lost. It will show up here.
          </NoticeCard>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <section className="rounded-2xl border border-lantern/25 bg-lantern/[0.04] p-5">
            <h2 className="font-syne text-lg text-paper">Agent wallet address</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="font-mono text-xs break-all text-lantern">{address}</code>
              <button
                type="button"
                onClick={copyAddress}
                className="rounded-lg border border-paper/25 bg-paper/5 px-3 py-1 font-mono text-xs text-paper/80 transition hover:bg-paper/10"
              >
                {copied ? "copied ✓" : "copy"}
              </button>
              <a
                href={`${getMonadExplorerUrl()}/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-lantern/80 underline transition-colors hover:text-lantern"
              >
                view on explorer ↗
              </a>
            </div>
            <p className="mt-3 text-sm text-paper/60">
              This is your agent wallet — a separate, permanent wallet that holds its own key and
              trades autonomously. Fund it from your MetaMask wallet and withdraw from it any time.
            </p>
          </section>

          <section className="rounded-2xl border border-lantern/25 bg-lantern/[0.04] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-syne text-lg text-paper">Assets</h2>
              <span className="font-mono text-[11px] text-paper/40">auto-refreshes</span>
            </div>
            <ul className="mt-3 divide-y divide-paper/10">
              {[
                { symbol: "MON", value: assets ? formatEther(assets.mon) : null },
                { symbol: "mCNY", value: assets ? formatUnits(assets.cny, 6) : null },
                { symbol: "mUSDC", value: assets ? formatUnits(assets.usd, 6) : null },
                { symbol: "mSGD", value: assets ? formatUnits(assets.sgd, 6) : null },
              ].map((asset) => (
                <li key={asset.symbol} className="flex items-center justify-between py-2.5">
                  <span className="font-mono text-sm text-paper/70">{asset.symbol}</span>
                  <span className="font-mono text-sm text-paper">
                    {asset.value ?? "…"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-paper/10 pt-4">
              <Link
                href="/agent/1"
                className="rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-2 font-mono text-sm text-lantern transition hover:bg-lantern/20"
              >
                Run the agent →
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
