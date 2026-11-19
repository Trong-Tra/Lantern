import type { Candle } from "../../libs/market/api";

// One timeframe = one native Hyperliquid candle size. Every chart keeps
// `bars` closed candles plus the candle still forming (limit = bars + 1), so
// the rightmost bar is the live one: 5m moves as a 5-minute candle, 1H as an
// hour candle, and so on. No synthetic candles, no rebucketing.
export const chartPeriods = ["5m", "1H", "1D", "1W", "1M"];
const TIMEFRAMES: Record<string, { interval: string; bars: number; refetchMs: number }> = {
  "5m": { interval: "5m", bars: 72, refetchMs: 1000 },
  "1H": { interval: "1h", bars: 72, refetchMs: 2000 },
  "1D": { interval: "1d", bars: 72, refetchMs: 5000 },
  "1W": { interval: "1w", bars: 24, refetchMs: 10000 },
  "1M": { interval: "1M", bars: 12, refetchMs: 20000 },
};
const DEFAULT_PERIOD = TIMEFRAMES["1H"];

/** Feed interval for a timeframe — the candle size the button names. */
export function chartIntervalFor(period: string): string {
  return (TIMEFRAMES[period] ?? DEFAULT_PERIOD).interval;
}

/** Closed candles plus the forming one — the bar that moves between polls. */
export function chartLimitFor(period: string): number {
  return (TIMEFRAMES[period] ?? DEFAULT_PERIOD).bars + 1;
}

/** Poll cadence for a timeframe — faster views poll faster so the last candle streams. */
export function chartRefetchFor(period: string): number {
  return (TIMEFRAMES[period] ?? DEFAULT_PERIOD).refetchMs;
}

/**
 * Glide one candle series into another on a live tick: right-aligned,
 * element-wise lerp between candles with the same open time, so the moving
 * last candle eases to its new values. Brand-new or rolled candles pop in at
 * their real values — no fabricated in-between shapes.
 */
export function interpolateCandles(from: Candle[], to: Candle[], t: number): Candle[] {
  if (!from.length || t >= 1) return to;
  const offset = to.length - from.length;
  return to.map((target, index) => {
    const source = index - offset >= 0 ? from[index - offset] : undefined;
    if (!source || source.t !== target.t) return target;
    const mix = (a: number, b: number) => a + (b - a) * t;
    return {
      t: target.t,
      o: mix(source.o, target.o),
      h: mix(source.h, target.h),
      l: mix(source.l, target.l),
      c: mix(source.c, target.c),
      v: mix(source.v, target.v),
    };
  });
}

export type ChartSeries = {
  timeLabels: string[];
  candles: { x: number; open: number; close: number; high: number; low: number }[];
  y: (value: number) => number;
  values: number[];
  /** Real traded volume per point (base units of the pair's quote side). */
  volumes: number[];
  points: { x: number; y: number; value: number }[];
  open: number;
  close: number;
  low: number;
  high: number;
  change: number;
  baseline: number;
  duration: string;
  path: string;
};

function formatAgo(tMs: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - tMs);
  if (delta < 60_000) return "now";
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.round(delta / 3_600_000)}h ago`;
  return `${Math.round(delta / 86_400_000)}d ago`;
}

function formatDuration(spanMs: number): string {
  const minutes = Math.max(1, Math.round(spanMs / 60_000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.max(1, Math.round(hours / 24));
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Build chart geometry from live feed candles (newest last, hour-aligned
 * open times in unix ms). Returns null when there is nothing to plot —
 * the chart renders its empty state instead of a fabricated series.
 */
export function buildChartSeries(
  raw: Candle[],
  period: string,
  nowMs: number = Date.now()
): ChartSeries | null {
  if (!Array.isArray(raw)) return null;
  const candles = raw
    .filter((c) => Number.isFinite(c?.t) && Number.isFinite(c?.c) && c.c > 0)
    .slice()
    .sort((a, b) => a.t - b.t);
  if (candles.length < 2) return null;

  const values = candles.map((c) => c.c);
  const first = candles[0];
  const last = candles[candles.length - 1];
  const open = first.o > 0 ? first.o : values[0];
  const close = values[values.length - 1];
  const low = Math.min(...candles.map((c) => c.l));
  const high = Math.max(...candles.map((c) => c.h));
  const change = open > 0 ? ((close - open) / open) * 100 : 0;

  const padding = (high - low) * 0.16 || Math.abs(close) * 0.004 || 1;
  const y = (value: number) =>
    Number(
      (
        230 - ((value - low + padding) / (high - low + padding * 2)) * 210
      ).toFixed(3)
    );

  const n = candles.length;
  // Band centers: each candle owns a 600/n slot, so the first and last bodies
  // sit fully inside the plot instead of being sliced in half by its edges.
  const xFor = (index: number) => 20 + ((index + 0.5) / n) * 600;
  const points = candles.map((c, index) => ({
    x: xFor(index),
    y: y(c.c),
    value: c.c,
  }));

  const labelIndex = [0, Math.floor((n - 1) * 0.25), Math.floor((n - 1) * 0.5), Math.floor((n - 1) * 0.75), n - 1];
  const timeLabels = labelIndex.map((index) => formatAgo(candles[index].t, nowMs));

  return {
    timeLabels,
    // One display candle per feed candle, sharing the line's x positions.
    candles: candles.map((c, index) => ({
      x: xFor(index),
      open: c.o,
      close: c.c,
      high: c.h,
      low: c.l,
    })),
    y,
    values,
    volumes: candles.map((c) => (Number.isFinite(c.v) && c.v > 0 ? c.v : 0)),
    points,
    open,
    close,
    low,
    high,
    change,
    baseline: y(open),
    duration: formatDuration(last.t - first.t),
    path: points
      .map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" "),
  };
}

// Smooth endpoints keep both chart phases from starting or stopping abruptly.
export function chartTransition(elapsed: number, previousProgress = 1) {
  const shrinking = elapsed < 320;
  const t = Math.max(
    0,
    Math.min(1, shrinking ? elapsed / 320 : (elapsed - 320) / 620)
  );
  const eased = (1 - Math.cos(Math.PI * t)) / 2;
  return {
    shrinking,
    progress: shrinking ? previousProgress * (1 - eased) : eased,
  };
}

export function formatChartAxis(
  value: number,
  referencePrice: number,
  supply?: number
) {
  const decimals = supply === undefined && referencePrice < 2 ? 6 : 2;
  return (supply === undefined ? value : value * supply).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      notation: supply === undefined ? "standard" : "compact",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }
  );
}

export function axisLabelFrame(
  previous: string,
  next: string,
  elapsed: number
) {
  const deleting = elapsed < 320;
  const source = deleting ? previous : next;
  const count = deleting
    ? Math.ceil(previous.length * Math.max(0, 1 - elapsed / 320))
    : Math.floor(next.length * Math.min(1, (elapsed - 320) / 480));
  const width = Math.max(previous.length, next.length);
  return {
    text: source.slice(0, count).padEnd(width, "\u00a0"),
    spin: elapsed >= 940 ? 0 : Math.floor(Math.max(0, elapsed) / 65) % 10,
  };
}
