"use client";

import { useEffect, useState, type PointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRightIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { monadTestnet } from "@/libs/chain";

// Light Glass treatment adapted from the supplied Originkit reference.
// Real connection via the same wagmi/injected stack as the vault panel
// (apps/web/src/components/molecules/vault-panel.tsx) — providers wrap the
// root layout in components/providers.tsx. Without a browser RPC configured
// we keep the honest notice instead of a dead button.
const rpcConfigured = Boolean(process.env.NEXT_PUBLIC_MONAD_RPC_URL);

export function ConnectWalletButton() {
  if (!rpcConfigured) return <RpcMissingNotice />;
  return <WalletButtonInner />;
}

function WalletButtonInner() {
  const account = useAccount();
  const { connect, error: connectError, isPending: isConnecting, reset } =
    useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const onCorrectChain = account.chainId === monadTestnet.id;
  const shortAddress = account.address
    ? `${account.address.slice(0, 6)}…${account.address.slice(-4)}`
    : null;

  // A rejected/stale error shouldn't stick around on the next attempt.
  useEffect(() => reset, [reset]);

  const label = !account.isConnected
    ? isConnecting
      ? "Connecting…"
      : connectError
        ? connectError.message.slice(0, 26)
        : "Connect Wallet"
    : !onCorrectChain
      ? isSwitching
        ? "Switching…"
        : "Switch to Monad Testnet"
      : shortAddress ?? "Connected";

  const onClick = () => {
    reset();
    if (!account.isConnected) {
      connect({ connector: injected() });
    } else if (!onCorrectChain) {
      switchChain({ chainId: monadTestnet.id });
    } else {
      disconnect();
    }
  };

  const title = !account.isConnected
    ? "Connect a wallet"
    : !onCorrectChain
      ? "Switch network"
      : "Disconnect";

  return (
    <button
      type="button"
      className="wallet-connect"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={isConnecting || isSwitching}
      onPointerMove={trackLight}
      onPointerLeave={(event) => {
        event.currentTarget.style.removeProperty("--glass-x");
        event.currentTarget.style.removeProperty("--glass-y");
      }}
    >
      <span className="wallet-connect__shine" aria-hidden="true" />
      <span className="wallet-connect__content">
        <span
          className="wallet-connect__icon wallet-connect__icon--wallet"
          aria-hidden="true"
        >
          <WalletIcon />
        </span>
        <span className="wallet-connect__label">{label}</span>
        <span
          className="wallet-connect__icon wallet-connect__icon--arrow"
          aria-hidden="true"
        >
          <ArrowRightIcon />
        </span>
      </span>
    </button>
  );
}

function RpcMissingNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent("lattern:dialog", { detail: true }));
    return () => {
      window.dispatchEvent(
        new CustomEvent("lattern:dialog", { detail: false })
      );
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="wallet-connect"
          onPointerMove={trackLight}
          onPointerLeave={(event) => {
            event.currentTarget.style.removeProperty("--glass-x");
            event.currentTarget.style.removeProperty("--glass-y");
          }}
        >
          <span className="wallet-connect__shine" aria-hidden="true" />
          <span className="wallet-connect__content">
            <span
              className="wallet-connect__icon wallet-connect__icon--wallet"
              aria-hidden="true"
            >
              <WalletIcon />
            </span>
            <span className="wallet-connect__label">Connect Wallet</span>
            <span
              className="wallet-connect__icon wallet-connect__icon--arrow"
              aria-hidden="true"
            >
              <ArrowRightIcon />
            </span>
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-90 bg-black/75 backdrop-blur-sm"
          data-lenis-prevent
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-100 w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-stone-950 p-6 text-stone-100 shadow-2xl focus:outline-none"
          data-lenis-prevent
        >
          <div className="mb-5 flex items-center justify-between">
            <WalletIcon className="size-7 text-amber-100" aria-hidden="true" />
            <Dialog.Close
              className="flex size-11 items-center justify-center rounded-lg text-stone-400 hover:bg-white/5 hover:text-white"
              aria-label="Close wallet dialog"
            >
              <XMarkIcon className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Title className="text-xl font-medium">
            Connect Wallet
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-stone-300">
            Wallet connection needs{" "}
            <code className="font-mono">NEXT_PUBLIC_MONAD_RPC_URL</code> set in{" "}
            <code className="font-mono">apps/web/.env</code>. Restart the dev
            server after adding it.
          </Dialog.Description>
          <Dialog.Close className="mt-6 min-h-11 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            Got it
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function trackLight(event: PointerEvent<HTMLButtonElement>) {
  if (
    event.pointerType === "touch" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const button = event.currentTarget;
  const bounds = button.getBoundingClientRect();
  button.style.setProperty("--glass-x", `${event.clientX - bounds.left}px`);
  button.style.setProperty("--glass-y", `${event.clientY - bounds.top}px`);
}
