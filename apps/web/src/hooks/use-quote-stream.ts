"use client";

import { useEffect, useRef, useState } from "react";
import { getQuoteWsUrl } from "@lantern/config";
import {
  QuoteClient,
  initialQuoteState,
  type QuoteState,
} from "@/libs/market/quote-ws";

export type IntentRequest = {
  /** Wallet address (0x…) — the quote's user and future settle caller. */
  user: string;
  tokenIn: string;
  tokenOut: string;
  /** Decimal string in tokenIn units. */
  amountIn: string;
};

const OPEN_DEBOUNCE_MS = 350;

/**
 * Owns the quote-protocol socket for the exchange: opens an intent for the
 * current request (debounced so typing doesn't spam intents), streams quotes,
 * and exposes pick. `request === null` (no wallet / amount / wrong mode)
 * keeps the stream idle.
 */
export function useQuoteStream(request: IntentRequest | null) {
  const [state, setState] = useState<QuoteState>(initialQuoteState);
  const clientRef = useRef<QuoteClient | null>(null);
  const requestRef = useRef<IntentRequest | null>(null);

  useEffect(() => {
    const client = new QuoteClient({
      url: getQuoteWsUrl(),
      onState: setState,
    });
    clientRef.current = client;
    client.connect();
    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  const serialized = request ? JSON.stringify(request) : "";
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    if (!serialized) {
      requestRef.current = null;
      client.reset();
      return;
    }
    const next = JSON.parse(serialized) as IntentRequest;
    requestRef.current = next;
    const timer = setTimeout(() => {
      client.openIntent(next);
    }, OPEN_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [serialized]);

  const pick = (quoteId: string) => clientRef.current?.pick(quoteId);

  /** Manual refresh: reopen the current intent immediately. */
  const reopen = () => {
    const current = requestRef.current;
    if (current) clientRef.current?.openIntent(current);
  };

  return { state, pick, reopen };
}
