// Quote-protocol WebSocket client: opens swap intents, streams signed
// solver quotes in one by one, retracts, pick. Frames mirror
// services/market/internal/protocol/quote.go (raw JSON, no GraphQL).
// Pure reducer + injectable socket factory so it is unit-testable.

export type QuoteRoute = { bps: number; pools: string[] };

export type QuoteBody = {
  agentId: string;
  user: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minOut: string;
  quotedOut: string;
  deadline: string;
  nonce: string;
  routes: QuoteRoute[];
};

export type SignedQuote = { quoteId: string; quote: QuoteBody; signature: string };

export type QuoteState = {
  /** An intent frame is on the wire, waiting for `intent_opened`. */
  awaitingIntent: boolean;
  /** The intent this connection may stream/pick for (null = none open). */
  intentId: string | null;
  /** Live quotes for the open intent, keyed by `"<agentId>:<nonce>"`. */
  quotes: Record<string, SignedQuote>;
  /** The quote the user picked (server confirmed via `picked`). */
  picked: SignedQuote | null;
  /** Non-null once the server closed the intent (reason: expired/picked/…). */
  closed: string | null;
  error: string | null;
};

export function initialQuoteState(): QuoteState {
  return {
    awaitingIntent: false,
    intentId: null,
    quotes: {},
    picked: null,
    closed: null,
    error: null,
  };
}

/** Server → user wire frames (see services/market/internal/protocol/quote.go). */
export type Frame =
  | { type: "intent_opened"; intentId: string }
  | { type: "quote"; intentId: string; quoteId: string; quote: QuoteBody; signature: string }
  | { type: "retract"; intentId: string; quoteId: string }
  | { type: "picked"; intentId: string; quoteId: string; quote: QuoteBody; signature: string }
  | { type: "closed"; intentId: string; reason: string }
  | { type: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Reduce one server frame onto the stream state. Unknown/stale frames are ignored. */
export function applyQuoteFrame(state: QuoteState, raw: unknown): QuoteState {
  if (!isRecord(raw) || typeof raw.type !== "string") return state;
  if (raw.type === "error") {
    const message = typeof raw.message === "string" ? raw.message : "quote stream error";
    return { ...state, error: message };
  }
  if (raw.type === "intent_opened") {
    if (!state.awaitingIntent || typeof raw.intentId !== "string") return state;
    return { ...state, awaitingIntent: false, intentId: raw.intentId, error: null };
  }
  // Everything below belongs to an open intent — drop stale frames from
  // intents this connection has already moved past.
  if (!state.intentId || !isRecord(raw) || raw.intentId !== state.intentId) return state;

  if (raw.type === "quote") {
    if (typeof raw.quoteId !== "string" || !isRecord(raw.quote) || typeof raw.signature !== "string")
      return state;
    const quotes = { ...state.quotes, [raw.quoteId]: { quoteId: raw.quoteId, quote: raw.quote as QuoteBody, signature: raw.signature } };
    return { ...state, quotes, error: null };
  }
  if (raw.type === "retract") {
    if (typeof raw.quoteId !== "string" || !(raw.quoteId in state.quotes)) return state;
    const quotes = { ...state.quotes };
    delete quotes[raw.quoteId];
    return { ...state, quotes };
  }
  if (raw.type === "picked") {
    if (typeof raw.quoteId !== "string" || !isRecord(raw.quote) || typeof raw.signature !== "string")
      return state;
    return {
      ...state,
      picked: { quoteId: raw.quoteId, quote: raw.quote as QuoteBody, signature: raw.signature },
    };
  }
  if (raw.type === "closed") {
    const reason = typeof raw.reason === "string" ? raw.reason : "closed";
    return { ...state, closed: reason, awaitingIntent: false };
  }
  return state;
}

/** Minimal WebSocket surface (injectable for tests; browser WebSocket fits). */
export type SocketLike = {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: string, listener: (event: unknown) => void): void;
};

export type SocketFactory = (url: string) => SocketLike;

const OPEN = 1;

export class QuoteClient {
  private readonly url: string;
  private readonly createSocket: SocketFactory;
  private readonly onState: (state: QuoteState) => void;
  private readonly reconnectDelayMs: number;
  private socket: SocketLike | null = null;
  private manualClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private queued: string[] = [];

  state: QuoteState = initialQuoteState();

  constructor(options: {
    url: string;
    createSocket?: SocketFactory;
    onState?: (state: QuoteState) => void;
    reconnectDelayMs?: number;
  }) {
    this.url = options.url;
    this.createSocket =
      options.createSocket ?? ((url) => new WebSocket(url) as unknown as SocketLike);
    this.onState = options.onState ?? (() => {});
    this.reconnectDelayMs = options.reconnectDelayMs ?? 3000;
  }

  connect(): void {
    this.manualClose = false;
    if (this.socket && this.socket.readyState === 0) return;
    this.emit({ ...this.state, error: null });
    const socket = this.createSocket(this.url);
    this.socket = socket;
    socket.addEventListener("open", () => {
      const pending = this.queued.splice(0);
      for (const frame of pending) this.sendRaw(frame);
    });
    socket.addEventListener("message", (event: unknown) => {
      const data = (event as { data?: unknown })?.data;
      if (typeof data !== "string") return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
      this.emit(applyQuoteFrame(this.state, parsed));
    });
    socket.addEventListener("close", () => this.handleDown());
    socket.addEventListener("error", () => this.handleDown());
  }

  /** Open a swap intent. amountIn is a decimal string in tokenIn units. */
  openIntent(msg: { user: string; tokenIn: string; tokenOut: string; amountIn: string }): void {
    // A new intent supersedes whatever this connection was streaming.
    this.emit({ ...initialQuoteState(), awaitingIntent: true });
    this.sendRaw(JSON.stringify({ type: "intent", ...msg }));
  }

  pick(quoteId: string): void {
    if (!this.state.intentId) return;
    this.sendRaw(JSON.stringify({ type: "pick", intentId: this.state.intentId, quoteId }));
  }

  /** Drop the current stream view (e.g. user cleared the amount). */
  reset(): void {
    if (this.state === initialQuoteState()) return;
    this.emit(initialQuoteState());
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.queued = [];
    this.socket?.close();
    this.socket = null;
  }

  private sendRaw(frame: string): void {
    if (this.socket && this.socket.readyState === OPEN) {
      this.socket.send(frame);
      return;
    }
    // Buffer until the socket opens (bounded — stale intents are superseded).
    this.queued.push(frame);
    if (this.queued.length > 4) this.queued.splice(0, this.queued.length - 4);
  }

  private handleDown(): void {
    if (this.manualClose) return;
    this.socket = null;
    // The server forgets which connection opened an intent — after a drop the
    // old stream is unpickable, so surface it as closed and reconnect fresh.
    if (this.state.intentId || this.state.awaitingIntent)
      this.emit({ ...initialQuoteState(), closed: "disconnected" });
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelayMs);
  }

  private emit(next: QuoteState): void {
    this.state = next;
    this.onState(next);
  }
}

/**
 * Does a quote's minimum received meet the user's slippage tolerance?
 * Integer bps math on the decimal-string bigints (the solver floors minOut,
 * so a 1-unit rounding slack keeps exact-tolerance quotes visible).
 */
export function quoteMeetsSlippage(quote: QuoteBody, slippagePercent: number): boolean {
  const bps = Math.round(slippagePercent * 100);
  if (!Number.isFinite(bps) || bps < 0 || bps > 10000) return false;
  try {
    const min = BigInt(quote.minOut);
    const quoted = BigInt(quote.quotedOut);
    if (quoted <= BigInt(0) || min <= BigInt(0) || min > quoted) return false;
    return min * BigInt(10000) + BigInt(9999) >= quoted * BigInt(10000 - bps);
  } catch {
    return false;
  }
}
