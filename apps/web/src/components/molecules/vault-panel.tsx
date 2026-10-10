"use client";

import { useState, type FormEvent } from "react";
import { formatEther, parseEther } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "@/libs/chain";
import { validateMonAmount } from "@/libs/explorer/vault";
import { buildExplorerTxUrl } from "@lantern/config";
import { NoticeCard } from "./explorer";

const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_AGENT_VAULT_ADDRESS ||
  "0xe09b383696D69B8A3Dfb2081a446D8fc62826328") as `0x${string}`;
/** The vault serves the reference yield agent (docs/02). */
const VAULT_AGENT_ID = 1;

const vaultAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/** Renders only for the vault's agent; needs a browser RPC to function. */
export function VaultPanel({ agentId }: { agentId: number }) {
  if (agentId !== VAULT_AGENT_ID) return null;

  if (!process.env.NEXT_PUBLIC_MONAD_RPC_URL) {
    return (
      <div className="mt-4">
        <NoticeCard title="Deposits disabled">
          Set <code className="font-mono text-lantern">NEXT_PUBLIC_MONAD_RPC_URL</code> in{" "}
          <code className="font-mono text-lantern">apps/web/.env</code> to enable wallet deposits on
          Monad testnet.
        </NoticeCard>
      </div>
    );
  }

  return <VaultPanelInner />;
}

function VaultPanelInner() {
  const account = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContract, isPending: isWriting, data: txHash, error: writeError } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const onCorrectChain = account.chainId === monadTestnet.id;

  const balance = useReadContract({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "balanceOf",
    args: account.address ? [account.address] : undefined,
    query: { enabled: Boolean(account.address) && onCorrectChain },
  });

  const confirmed = receipt.isSuccess;

  function submitDeposit(event: FormEvent) {
    event.preventDefault();
    const invalid = validateMonAmount(depositAmount);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setFormError(null);
    writeContract({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "deposit",
      value: parseEther(depositAmount.trim()),
    });
  }

  function submitWithdraw(event: FormEvent) {
    event.preventDefault();
    const invalid = validateMonAmount(withdrawAmount);
    if (invalid) {
      setFormError(invalid);
      return;
    }
    setFormError(null);
    writeContract({
      address: VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: "withdraw",
      args: [parseEther(withdrawAmount.trim())],
    });
  }

  if (!account.isConnected) {
    return (
      <section className="mt-4 rounded-xl border border-lantern/30 bg-lantern/[0.04] p-5">
        <h2 className="font-syne text-lg text-paper">Stake with this agent</h2>
        <p className="mt-1 text-sm text-paper/60">
          Deposit MON into the yield agent&apos;s pool. Every deposit and withdrawal mints a soulbound
          ERC-5192 attestation — reputation is earned in the open.
        </p>
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

  return (
    <section className="mt-4 rounded-xl border border-lantern/30 bg-lantern/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-syne text-lg text-paper">Stake with this agent</h2>
        <button
          type="button"
          onClick={() => disconnect()}
          className="font-mono text-xs text-paper/50 hover:text-paper"
        >
          {account.address?.slice(0, 6)}…{account.address?.slice(-4)} · disconnect
        </button>
      </div>

      {!onCorrectChain ? (
        <div className="mt-4">
          <p className="text-sm text-paper/60">
            Switch to Monad Testnet (chain {monadTestnet.id}) to deposit.
          </p>
          <button
            type="button"
            onClick={() => switchChain({ chainId: monadTestnet.id })}
            className="mt-3 rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-2 font-mono text-sm text-lantern transition hover:bg-lantern/20"
          >
            Switch network
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1 font-mono text-xs text-paper/50">
            Your vault balance:{" "}
            <span className="text-paper">
              {balance.data !== undefined ? `${formatEther(balance.data)} MON` : "…"}
            </span>
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <form onSubmit={submitDeposit} className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wide text-paper/40">
                Deposit MON
              </label>
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.5"
                inputMode="decimal"
                className="w-full rounded-lg border border-paper/20 bg-ink/40 px-3 py-2 font-mono text-sm text-paper outline-none focus:border-lantern/60"
              />
              <button
                type="submit"
                disabled={isWriting}
                className="w-full rounded-lg border border-lantern/50 bg-lantern/10 px-4 py-2 font-mono text-sm text-lantern transition hover:bg-lantern/20 disabled:opacity-50"
              >
                {isWriting ? "Confirm in wallet…" : "Deposit"}
              </button>
            </form>

            <form onSubmit={submitWithdraw} className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wide text-paper/40">
                Withdraw MON
              </label>
              <input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.5"
                inputMode="decimal"
                className="w-full rounded-lg border border-paper/20 bg-ink/40 px-3 py-2 font-mono text-sm text-paper outline-none focus:border-lantern/60"
              />
              <button
                type="submit"
                disabled={isWriting}
                className="w-full rounded-lg border border-paper/25 bg-paper/5 px-4 py-2 font-mono text-sm text-paper/80 transition hover:bg-paper/10 disabled:opacity-50"
              >
                {isWriting ? "Confirm in wallet…" : "Withdraw"}
              </button>
            </form>
          </div>

          {formError ? <p className="mt-3 text-sm text-red-300">{formError}</p> : null}
          {writeError ? (
            <p className="mt-3 text-sm text-red-300">{writeError.message.slice(0, 120)}</p>
          ) : null}
          {confirmed && txHash ? (
            <p className="mt-3 text-sm text-emerald-300">
              Confirmed — a soulbound attestation was minted. It appears in the history above once
              the indexer picks it up.{" "}
              <a
                href={buildExplorerTxUrl(txHash)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-lantern underline"
              >
                view tx ↗
              </a>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
