import { mockAssets } from "./mock-data";

export const chartPeriods = ["1H", "1D", "1W", "1M", "1Y", "All"];
const changes = [0.84, -4.82, -3.26, 12.4, 28.6, 42.1];
const durations = [
  "1 hour",
  "24 hours",
  "7 days",
  "30 days",
  "1 year",
  "2 years",
];

// Fictional market metadata for the development-only chart.
export const mockMarkets: Record<
  string,
  { supply: number; volume: number; holders: string; age: string }
> = {
  MON: {
    supply: 10_000_000_000,
    volume: 18_600_000,
    holders: "124K",
    age: "1y",
  },
  USDC: {
    supply: 50_000_000_000,
    volume: 1_280_000_000,
    holders: "3.2M",
    age: "8y",
  },
  ETH: {
    supply: 120_000_000,
    volume: 18_650_000_000,
    holders: "3.3M",
    age: "11y",
  },
};

export function getChartData(symbol: string, period: string) {
  const asset = mockAssets[symbol];
  const periodIndex = chartPeriods.indexOf(period);
  if (!asset || periodIndex < 0)
    throw new Error("Unknown mock chart asset or period");
  const change =
    symbol === "USDC"
      ? changes[periodIndex] * 0.004
      : symbol === "ETH"
        ? changes[periodIndex] * -0.7
        : changes[periodIndex];
  const close = asset.price;
  const open = close / (1 + change / 100);
  const amplitude =
    Math.abs(close - open) * 0.36 +
    close * (symbol === "USDC" ? 0.0001 : 0.003);
  const values = Array.from({ length: 49 }, (_, index) => {
    const progress = index / 48;
    const wave =
      Math.sin(progress * Math.PI * 9 + periodIndex) *
      Math.sin(progress * Math.PI) *
      amplitude;
    return open + (close - open) * progress + wave;
  });
  // Keep fixture endpoints exact, so the chart and displayed change agree.
  values[0] = open;
  values[48] = close;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const padding = (high - low) * 0.16;
  const y = (value: number) =>
    Number(
      (
        230 -
        ((value - low + padding) / (high - low + padding * 2)) * 210
      ).toFixed(3)
    );
  const points = values.map((value, index) => ({
    x: 20 + (index / 48) * 600,
    y: y(value),
    value,
  }));
  const candles = Array.from({ length: 16 }, (_, index) => {
    const group = values.slice(index * 3, index * 3 + 4);
    return {
      x: 20 + ((index + 0.5) / 16) * 600,
      open: group[0],
      close: group[group.length - 1],
      high: Math.max(...group),
      low: Math.min(...group),
    };
  });
  return {
    timeLabels: [
      ["1h ago", "45m ago", "30m ago", "15m ago", "Now"],
      ["24h ago", "18h ago", "12h ago", "6h ago", "Now"],
      ["7d ago", "5d ago", "3.5d ago", "2d ago", "Now"],
      ["30d ago", "23d ago", "15d ago", "7d ago", "Now"],
      ["1y ago", "9mo ago", "6mo ago", "3mo ago", "Now"],
      ["2y ago", "18mo ago", "1y ago", "6mo ago", "Now"],
    ][periodIndex],
    candles,
    y,
    values,
    points,
    open,
    close,
    low,
    high,
    change,
    baseline: y(open),
    duration: durations[periodIndex],
    path: points
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
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
