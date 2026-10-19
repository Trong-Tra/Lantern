"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther, formatUnits, maxUint256, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http, type Address, type Hash } from "viem";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useAccount,
  useConnect,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "@/libs/chain";
import { validateMonAmount } from "@/libs/explorer/vault";
import { buildExplorerTxUrl, getMonadExplorerUrl } from "@lantern/config";
import { NoticeCard } from "./explorer";

const POOL_ADDRESS = (process.env.NEXT_PUBLIC_DEMO_FX_POOL_ADDRESS ||
  "0xC8929Caaa4370B756c927E4b99883eb5FBED77cd") as Address;
const DEMO_AGENT_ID = 1;
const RPC_URL = process.env.NEXT_PUBLIC_MONAD_RPC_URL || "";
const STORAGE_KEY = "lantern.agentWallet.v1";

const R_MON_CNY = 0;
const R_CNY_USDC = 1;
const R_USDC_MON = 2;
const R_MON_SGD = 3;

const BOOT_MON = parseEther("0.3");
const HOP3_MON = parseEther("0.25");
const MIN_FUND = parseEther("0.6");
const SWAP_SLOTS = 3;
const GAS_RESERVE = parseEther("0.02");

const poolAbi = [
  {
    type: "function",
    name: "enroll",
    inputs: [{ name: "maxSwaps", type: "uint16" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "swap",
    inputs: [
      { name: "routeId", type: "uint8" },
      { name: "inAmount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "policies",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [
      { name: "maxSwaps", type: "uint16" },
      { name: "used", type: "uint16" },
      { name: "set", type: "bool" },
    ],
    stateMutability: "view",
  },
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
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const STEP_LABELS = [
  "Setting the agent's 3-swap limit",
  "Converting 0.3 MON into CNY",
  "Swapping CNY → USDC",
  "Swapping USDC → MON",
  "Swapping MON → SGD",
  "Checking the swap limit",
] as const;

type StepState = "pending" | "active" | "done" | "failed";
type Step = { state: StepState; hash?: Hash; note?: string };
type PolicyInfo = { maxSwaps: number; used: number; set: boolean } | null;
type TokenAddrs = { usdc: Address; cny: Address; sgd: Address } | null;

function loadWalletKey(): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  return (window.localStorage.getItem(STORAGE_KEY) as `0x${string}` | null) ?? null;
}

function shortError(error: unknown): string {
  const e = error as { details?: string; shortMessage?: string; message?: string };
  return (e?.details || e?.shortMessage || e?.message || String(error)).slice(0, 160);
}

export function SwapDemoPanel({ agentId }: { agentId: number }) {
  if (agentId !== DEMO_AGENT_ID) return null;

  if (!RPC_URL) {
    return (
      <div className="mt-4">
        <NoticeCard title="Agent disabled">
          Set <code className="font-mono text-lantern">NEXT_PUBLIC_MONAD_RPC_URL</code> in{" "}
          <code className="font-mono text-lantern">apps/web/.env</code>.
        </NoticeCard>
      </div>
    );
  }

  return <SwapDemoPanelInner />;
}

function SwapDemoPanelInner() {
  const router = useRouter();

  // User wallet (MetaMask).
  const account = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { switchChain } = useSwitchChain();
  const { sendTransaction, isPending: isFunding, data: fundHash, error: fundSendError } =
    useSendTransaction();
  const fundReceipt = useWaitForTransactionReceipt({ hash: fundHash });

  // Agent wallet (separate permanent key, auto-signs swaps).
  const [agentKey, setAgentKey] = useState<`0x${string}` | null>(null);
  const demoAccount = useMemo(() => (agentKey ? privateKeyToAccount(agentKey) : null), [agentKey]);
  const publicClient = useMemo(
    () => createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) }),
    [],
  );
  const agentWalletClient = useMemo(
    () =>
      demoAccount
        ? createWalletClient({ account: demoAccount, chain: monadTestnet, transport: http(RPC_URL) })
        : null,
    [demoAccount],
  );

  const [balance, setBalance] = useState<bigint | null>(null);
  const [tokens, setTokens] = useState<TokenAddrs>(null);
  const [tokenBalances, setTokenBalances] = useState<{ cny: bigint; usd: bigint; sgd: bigint } | null>(null);
  const [policy, setPolicy] = useState<PolicyInfo>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>(STEP_LABELS.map(() => ({ state: "pending" })));
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startAt, setStartAt] = useState(0);

  useEffect(() => {
    const restore = setTimeout(() => setAgentKey(loadWalletKey()), 0);
    return () => clearTimeout(restore);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [usdcAddr, cnyAddr, sgdAddr] = await Promise.all([
        publicClient.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "usdc" }),
        publicClient.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "cny" }),
        publicClient.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "sgd" }),
      ]);
      if (!cancelled) setTokens({ usdc: usdcAddr, cny: cnyAddr, sgd: sgdAddr });
    })();
    return () => { cancelled = true; };
  }, [publicClient]);

  const refreshChainState = useMemo(() => async () => {
    if (!demoAccount || !tokens) return;
    const [mon, cnyBal, usdBal, sgdBal, pol] = await Promise.all([
      publicClient.getBalance({ address: demoAccount.address }),
      publicClient.readContract({ address: tokens.cny, abi: erc20Abi, functionName: "balanceOf", args: [demoAccount.address] }),
      publicClient.readContract({ address: tokens.usdc, abi: erc20Abi, functionName: "balanceOf", args: [demoAccount.address] }),
      publicClient.readContract({ address: tokens.sgd, abi: erc20Abi, functionName: "balanceOf", args: [demoAccount.address] }),
      publicClient.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "policies", args: [demoAccount.address] }).then((r) => ({ maxSwaps: r[0], used: r[1], set: r[2] })).catch(() => null),
    ]);
    setBalance(mon);
    setTokenBalances({ cny: cnyBal, usd: usdBal, sgd: sgdBal });
    setPolicy(pol);
  }, [demoAccount, publicClient, tokens]);

  useEffect(() => {
    if (!demoAccount || !tokens) return;
    const kick = setTimeout(() => void refreshChainState(), 0);
    const timer = setInterval(() => void refreshChainState(), 5_000);
    return () => { clearTimeout(kick); clearInterval(timer); };
  }, [demoAccount, tokens, refreshChainState]);

  useEffect(() => {
    if (!fundReceipt.isSuccess) return;
    const t = setTimeout(() => void refreshChainState(), 0);
    return () => clearTimeout(t);
  }, [fundReceipt.isSuccess, refreshChainState]);

  const createAgentWallet = () => {
    const pk = generatePrivateKey();
    window.localStorage.setItem(STORAGE_KEY, pk);
    setAgentKey(pk);
  };

  const fundAgent = () => {
    if (!account.address || !demoAccount) return;
    const invalid = validateMonAmount(fundAmount);
    if (invalid) { setFormError(invalid); return; }
    setFormError(null);
    sendTransaction({ to: demoAccount.address, value: parseEther(fundAmount.trim()) });
  };

  const withdrawAgent = async () => {
    if (!agentWalletClient || !demoAccount || !account.address) return;
    const invalid = validateMonAmount(withdrawAmount);
    if (invalid) { setFormError(invalid); return; }
    const amt = parseEther(withdrawAmount.trim());
    if (balance === null || balance < amt) { setFormError("Insufficient MON"); return; }
    if (balance - amt < GAS_RESERVE) { setFormError("Would leave agent without gas"); return; }
    setFormError(null);
    try {
      const hash = await agentWalletClient.sendTransaction({ to: account.address, value: amt });
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshChainState();
    } catch (error) {
      setFormError(shortError(error));
    }
  };

  const waitFor = async (hash: Hash) => { await publicClient.waitForTransactionReceipt({ hash }); return hash; };

  const enrolled = async () => {
    if (!agentWalletClient) throw new Error("agent wallet not ready");
    return waitFor(await agentWalletClient.writeContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "enroll", args: [SWAP_SLOTS], chain: monadTestnet, account: demoAccount }));
  };

  const swap = async (route: number, inAmount: bigint, value?: bigint) => {
    if (!agentWalletClient) throw new Error("agent wallet not ready");
    return waitFor(await agentWalletClient.writeContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "swap", args: [route, inAmount], value, chain: monadTestnet, account: demoAccount }));
  };

  const ensureAllowance = async (token: Address, needed: bigint) => {
    if (!demoAccount || !agentWalletClient) return;
    const current = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [demoAccount.address, POOL_ADDRESS] });
    if (current >= needed) return;
    const hash = await agentWalletClient.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [POOL_ADDRESS, maxUint256], chain: monadTestnet, account: demoAccount });
    await waitFor(hash);
  };

  const funded = balance !== null && balance >= MIN_FUND;
  const policySet = policy !== null && policy.set;
  const completed = policySet && policy.used >= SWAP_SLOTS;
  const resume = policySet && !completed && policy.used > 0;

  const setStep = (index: number, next: Step) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? next : s)));

  const runAgent = async () => {
    if (!agentWalletClient || !demoAccount || running || !tokens) return;
    setRunning(true); setFinished(false); setFormError(null);
    setSteps(STEP_LABELS.map(() => ({ state: "pending" })));

    let activeStep = -1;
    try {
      const [livePolicy, cnyHeld] = await Promise.all([
        publicClient.readContract({ address: POOL_ADDRESS, abi: poolAbi, functionName: "policies", args: [demoAccount.address] }),
        publicClient.readContract({ address: tokens.cny, abi: erc20Abi, functionName: "balanceOf", args: [demoAccount.address] }),
      ]);
      const used = livePolicy[1];
      let start = 0;
      if (livePolicy[2]) {
        if (used === 0) start = cnyHeld > BigInt(0) ? 2 : 1;
        else if (used === 1) start = 3;
        else if (used === 2) start = 4;
      }
      setStartAt(start);

      if (start <= 0) { activeStep = 0; setStep(0, { state: "active" }); const h0 = await enrolled(); setStep(0, { state: "done", hash: h0, note: `${SWAP_SLOTS} swaps allowed` }); }
      if (start <= 1) { activeStep = 1; setStep(1, { state: "active" }); const h1 = await swap(R_MON_CNY, BOOT_MON, BOOT_MON); setStep(1, { state: "done", hash: h1, note: "bought 25.56 mCNY" }); }
      if (start <= 2) { activeStep = 2; setStep(2, { state: "active" }); const cnyBal = await publicClient.readContract({ address: tokens.cny, abi: erc20Abi, functionName: "balanceOf", args: [demoAccount.address] }); await ensureAllowance(tokens.cny, cnyBal); const h2 = await swap(R_CNY_USDC, cnyBal); setStep(2, { state: "done", hash: h2, note: "swapped into USDC" }); }
      if (start <= 3) { activeStep = 3; setStep(3, { state: "active" }); const usdBal = await publicClient.readContract({ address: tokens.usdc, abi: erc20Abi, functionName: "balanceOf", args: [demoAccount.address] }); await ensureAllowance(tokens.usdc, usdBal); const h3 = await swap(R_USDC_MON, usdBal); setStep(3, { state: "done", hash: h3, note: "swapped into MON" }); }
      if (start <= 4) { activeStep = 4; setStep(4, { state: "active" }); const h4 = await swap(R_MON_SGD, HOP3_MON, HOP3_MON); setStep(4, { state: "done", hash: h4, note: "swapped into SGD" }); }

      activeStep = 5; setStep(5, { state: "active" });
      try { await swap(R_CNY_USDC, BigInt(1_000_000)); setStep(5, { state: "done", note: "limit did not hold — unexpected" }); }
      catch (gateError) { const message = shortError(gateError); if (message.toLowerCase().includes("policy exhausted")) setStep(5, { state: "done", note: "limit reached — agent stopped ✓" }); else setStep(5, { state: "failed", note: message }); }

      setFinished(true); await refreshChainState(); router.refresh();
    } catch (error) { if (activeStep >= 0) setStep(activeStep, { state: "failed", note: shortError(error) }); return; }
    finally { setRunning(false); }
  };

  const onCorrectChain = account.chainId === monadTestnet.id;
  const agentAddress = demoAccount?.address;
  const agentExists = Boolean(agentKey && agentAddress);

  // ---- No agent wallet yet ----
  if (!agentExists) {
    return (
      <section className="rounded-2xl border border-lantern/25 bg-lantern/[0.04] p-5">
        <h2 className="font-syne text-lg text-paper">Create agent wallet</h2>
        <p className="mt-2 text-sm text-paper/60">
          The agent wallet trades on its own. Create it once — it is permanent and never recreated,
          so your funds are never lost.
        </p>
        <button
          type="button"
          onClick={createAgentWallet}
          className="mt-4 w-full rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-2 font-mono text-sm text-lantern transition hover:bg-lantern/20"
        >
          Create agent wallet
        </button>
        <p className="mt-3 font-mono text-[11px] text-paper/40">Testnet only — the agent key lives in this browser.</p>
      </section>
    );
  }

  // ---- Agent wallet exists ----
  if (!account.isConnected) {
    return (
      <section className="rounded-2xl border border-lantern/25 bg-lantern/[0.04] p-5">
        <h2 className="font-syne text-lg text-paper">Agent wallet</h2>
        <p className="mt-2 text-sm text-paper/60">{agentAddress}</p>
        <button
          type="button"
          onClick={() => connect({ connector: injected() })}
          disabled={isConnecting}
          className="mt-4 rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-2 font-mono text-sm text-lantern transition hover:bg-lantern/20 disabled:opacity-50"
        >
          {isConnecting ? "Connecting…" : "Connect MetaMask"}
        </button>
      </section>
    );
  }

  if (!onCorrectChain) {
    return (
      <section className="rounded-2xl border border-lantern/25 bg-lantern/[0.04] p-5">
        <h2 className="font-syne text-lg text-paper">Agent wallet</h2>
        <p className="mt-2 text-sm text-paper/60">{agentAddress}</p>
        <p className="mt-2 text-sm text-paper/50">Switch to Monad Testnet to fund and run.</p>
        <button
          type="button"
          onClick={() => switchChain({ chainId: monadTestnet.id })}
          className="mt-3 rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-2 font-mono text-sm text-lantern transition hover:bg-lantern/20"
        >
          Switch network
        </button>
      </section>
    );
  }

  if (balance === null || !tokens) {
    return (
      <section className="rounded-2xl border border-lantern/25 bg-lantern/[0.04] p-5">
        <h2 className="font-syne text-lg text-paper">Agent wallet</h2>
        <p className="mt-2 text-sm text-paper/60">{agentAddress}</p>
        <p className="mt-2 text-sm text-paper/50">Reading balances…</p>
      </section>
    );
  }

  const doneAll = completed || finished;

  const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  const explorerUrl = (a: Address) => `${getMonadExplorerUrl()}/address/${a}`;
  const addr = agentAddress!;

  return (
    <section className="rounded-2xl border border-lantern/25 bg-lantern/[0.04] p-5">
      <h2 className="font-syne text-lg text-paper">Agent wallet</h2>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-xs text-paper/60">{shortAddress(addr)}</span>
        <a
          href={explorerUrl(addr)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-paper/25 bg-paper/5 px-3 py-1 font-mono text-xs text-paper/80 transition hover:bg-paper/10"
        >
          view on monadscan ↗
        </a>
      </div>
      <p className="mt-1 text-sm text-paper/60">Balance: <span className="text-paper">{formatEther(balance)} MON</span></p>

      <div className="mt-4 flex gap-2 sm:max-w-sm">
        <input
          value={fundAmount}
          onChange={(e) => setFundAmount(e.target.value)}
          placeholder="Fund MON"
          inputMode="decimal"
          className="flex-1 rounded-lg border border-paper/20 bg-ink/40 px-3 py-2 font-mono text-sm text-paper outline-none focus:border-lantern/60"
        />
        <button
          type="button"
          onClick={fundAgent}
          disabled={isFunding}
          className="rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-2 font-mono text-sm text-lantern transition hover:bg-lantern/20 disabled:opacity-50"
        >
          {isFunding ? "Confirm…" : "Fund"}
        </button>
      </div>
      <p className="mt-2 text-xs text-paper/40">{formatEther(MIN_FUND)} MON minimum to run the agent.</p>
      {fundSendError ? <p className="mt-2 text-sm text-red-300">{shortError(fundSendError)}</p> : null}
      {fundReceipt.isSuccess && fundHash ? (
        <p className="mt-2 text-sm text-emerald-300">
          Funded — <a href={buildExplorerTxUrl(fundHash)} target="_blank" rel="noreferrer" className="font-mono text-lantern underline">view tx ↗</a>
        </p>
      ) : null}

      {/* Withdraw anytime there's spendable MON (not gated by the run minimum). */}
      <div className="mt-4 flex gap-2 sm:max-w-sm">
        <input
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          placeholder="Withdraw MON"
          inputMode="decimal"
          className="flex-1 rounded-lg border border-paper/20 bg-ink/40 px-3 py-2 font-mono text-sm text-paper outline-none focus:border-lantern/60"
        />
        <button
          type="button"
          onClick={withdrawAgent}
          disabled={running || balance === null || balance <= GAS_RESERVE || withdrawAmount.trim() === ""}
          className="rounded-lg border border-paper/25 bg-paper/5 px-4 py-2 font-mono text-sm text-paper/80 transition hover:bg-paper/10 disabled:opacity-50"
        >
          {running ? "Executing…" : "Withdraw"}
        </button>
      </div>
      {formError ? <p className="mt-2 text-sm text-red-300">{formError}</p> : null}

      {!funded ? (
        <p className="mt-3 text-sm text-paper/50">
          Fund the agent wallet above to enable trading and gas.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-paper/60">
            Funded and ready. The agent signs swaps itself — you never sign a trade.
          </p>
          {!doneAll ? (
            <button
              type="button"
              onClick={() => void runAgent()}
              disabled={running || !agentWalletClient}
              className="mt-4 w-full rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-2.5 font-mono text-sm text-lantern transition hover:bg-lantern/20 disabled:opacity-60"
            >
              {running ? "Agent executing…" : resume ? "Continue agent" : "Release agent"}
            </button>
          ) : null}

          {running || doneAll ? (
            <ol className="mt-4 space-y-2">
              {STEP_LABELS.map((label, i) => {
                const step = steps[i];
                const skipped = i < startAt;
                return (
                  <li key={label} className="flex items-center gap-2 rounded-xl border border-paper/10 bg-ink/40 px-3 py-2 text-sm">
                    <span className={`text-[11px] ${skipped ? "text-emerald-300/60" : step.state === "done" ? "text-emerald-300" : step.state === "failed" ? "text-red-300" : step.state === "active" ? "text-lantern" : "text-paper/30"}`}>
                      {skipped ? "✓" : step.state === "done" ? "✓" : step.state === "failed" ? "✕" : step.state === "active" ? "▸" : "·"}
                    </span>
                    <span className={`text-[11px] ${skipped || step.state === "pending" ? "text-paper/40" : "text-paper/85"}`}>{label}</span>
                    {skipped ? <span className="ml-auto w-full text-right font-mono text-[11px] text-paper/50">done in an earlier run</span> : step.note ? <span className="ml-auto w-full text-right font-mono text-[11px] text-paper/50">{step.note}</span> : null}
                    {step.hash ? <a href={buildExplorerTxUrl(step.hash)} target="_blank" rel="noreferrer" className="ml-2 font-mono text-[11px] text-lantern/80 hover:text-lantern">tx ↗</a> : null}
                  </li>
                );
              })}
            </ol>
          ) : null}

          {doneAll ? (
            <div className="mt-4 rounded-xl border border-lantern/20 bg-ink/40 px-4 py-3">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-paper/60">
                <div className="flex justify-between"><dt>MON</dt><dd className="text-paper/90">{formatEther(balance)}</dd></div>
                <div className="flex justify-between"><dt>mCNY</dt><dd className="text-paper/90">{tokenBalances ? formatUnits(tokenBalances.cny, 6) : "…"}</dd></div>
                <div className="flex justify-between"><dt>mUSDC</dt><dd className="text-paper/90">{tokenBalances ? formatUnits(tokenBalances.usd, 6) : "…"}</dd></div>
                <div className="flex justify-between"><dt>mSGD</dt><dd className="text-paper/90">{tokenBalances ? formatUnits(tokenBalances.sgd, 6) : "…"}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-paper/50">Assets are in your agent wallet — withdraw to MetaMask any time above.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => router.refresh()} className="rounded-lg border border-paper/25 bg-paper/5 px-3 py-1.5 font-mono text-xs text-paper/80 hover:bg-paper/10">Refresh ↻</button>
                <button onClick={() => { setFinished(false); void runAgent(); }} disabled={running} className="rounded-lg border border-lantern/50 bg-lantern/10 px-3 py-1.5 font-mono text-xs text-lantern hover:bg-lantern/20 disabled:opacity-50">Run again ↻</button>
              </div>
              <Link href="/wallet" className="mt-3 inline-block rounded-lg border border-lantern/50 bg-lantern/10 px-3 py-1.5 font-mono text-xs text-lantern hover:bg-lantern/20">Manage funds →</Link>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
