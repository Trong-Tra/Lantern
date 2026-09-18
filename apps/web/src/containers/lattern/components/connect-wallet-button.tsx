"use client";

import { useEffect, useState, type PointerEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRightIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Light Glass treatment adapted from the supplied Originkit reference.
// This preview has no wallet provider: never simulate a connected account.
export function ConnectWalletButton() {
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

  const trackLight = (event: PointerEvent<HTMLButtonElement>) => {
    if (
      event.pointerType === "touch" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const button = event.currentTarget;
    const bounds = button.getBoundingClientRect();
    button.style.setProperty("--glass-x", `${event.clientX - bounds.left}px`);
    button.style.setProperty("--glass-y", `${event.clientY - bounds.top}px`);
  };

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
            Wallet connection is not available in this demo yet. You can explore
            Lattern with sample agents — no wallet, signatures or transactions
            required.
          </Dialog.Description>
          <Dialog.Close className="mt-6 min-h-11 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            Got it
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
