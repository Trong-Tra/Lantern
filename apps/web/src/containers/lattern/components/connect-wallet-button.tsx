"use client";

import { useEffect, type PointerEvent } from "react";
import {
  ArrowRightIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { avalancheFuji } from "@/libs/chain";

// Light Glass treatment adapted from the supplied Originkit reference.
// Real connection via the same wagmi/injected stack as the vault panel
// (apps/web/src/components/molecules/vault-panel.tsx) — providers wrap the
// root layout in components/providers.tsx with Avalanche Fuji as the chain.

export function ConnectWalletButton() {
  return <WalletButtonInner />;
}

function WalletButtonInner() {
  const account = useAccount();
  const { connect, error: connectError, isPending: isConnecting, reset } =
    useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const onCorrectChain = account.chainId === avalancheFuji.id;
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
        : "Switch to Avalanche Fuji"
      : shortAddress ?? "Connected";

  const onClick = () => {
    reset();
    if (!account.isConnected) {
      connect({ connector: injected() });
    } else if (!onCorrectChain) {
      switchChain({ chainId: avalancheFuji.id });
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
