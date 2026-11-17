import type { Candle } from "../../libs/market/api";

// Periods served by the display feed (CHART_INTERVAL must match
// marketdata.json's candleInterval). 5m = last 5 minutes on 1m candles
// (HL's finest interval — sub-minute is rejected), 1H = last hour on 1m.
export const chartPeriods = ["5m", "1H", "1D", "1W", "1M", "All"];
export const CHART_INTERVAL = "1h";
const PERIOD_LIMITS: Record<string, number> = {
  "5m": 5,
  "1H": 60,
  "1D": 48,
  "1W": 336,
  "1M": 1440,
  All: 4000,
};

/** Candle limit to request for a chart timeframe. */
export function chartLimitFor(period: string): number {
  return PERIOD_LIMITS[period] ?? 168;
}

/** Feed interval for a timeframe — 5m and 1H ride the live 1m stream, the rest the 1h stream. */
export function chartIntervalFor(period: string): string {
  if (period === "5m" || period === "1H") return "1m";
  return CHART_INTERVAL;
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

/** Bucket real OHLCV candles into at most `max` display candles. */
function bucketCandles(candles: Candle[], max: number) {
  const count = Math.min(max, candles.length);
  const size = candles.length / count;
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(index * size);
    const end = Math.max(start + 1, Math.floor((index + 1) * size));
    const slice = candles.slice(start, end);
    return {
      x: 20 + ((index + 0.5) / count) * 600,
      open: slice[0].o,
      close: slice[slice.length - 1].c,
      high: Math.max(...slice.map((c) => c.h)),
      low: Math.min(...slice.map((c) => c.l)),
    };
  });
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
  const points = candles.map((c, index) => ({
    x: 20 + (n === 1 ? 0 : (index / (n - 1)) * 600),
    y: y(c.c),
    value: c.c,
  }));

  const labelIndex = [0, Math.floor((n - 1) * 0.25), Math.floor((n - 1) * 0.5), Math.floor((n - 1) * 0.75), n - 1];
  const timeLabels = labelIndex.map((index) => formatAgo(candles[index].t, nowMs));

  return {
    timeLabels,
    candles: bucketCandles(candles, 96),
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
