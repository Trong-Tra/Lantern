"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import {
  chartPeriods,
  chartTransition,
  buildChartSeries,
  formatChartAxis,
  axisLabelFrame,
  chartIntervalFor,
  chartLimitFor,
  chartRefetchFor,
  interpolateCandles,
  type ChartSeries,
} from "./chart-data";
import type { Candle } from "@/libs/market/api";
import { useMarketCandles, useMarketPrices } from "@/hooks/use-market";
import {
  displaySymbol,
  findToken,
  tokenUsdPrice,
  type MarketToken,
} from "@/libs/market/tokens";

function dollars(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 2 ? 6 : 2,
  });
}
function compact(value: number) {
  return `$${value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 })}`;
}

function RollingValue({
  value,
  spin = 0,
  letters = false,
}: {
  value: string;
  spin?: number;
  letters?: boolean;
}) {
  return (
    <span
      className={letters ? "rolling-value rolling-name" : "rolling-value"}
      aria-label={value}
    >
      <span aria-hidden="true">
        {Array.from(value).map((character, index) => {
          const alphabet = /[0-9]/.test(character)
            ? "0123456789"
            : letters && /[A-Z]/.test(character)
              ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
              : letters && /[a-z]/.test(character)
                ? "abcdefghijklmnopqrstuvwxyz"
                : "";
          return alphabet ? (
            <span
              className={
                letters ? "rolling-digit rolling-letter" : "rolling-digit"
              }
              data-character={letters ? character : undefined}
              key={index}
            >
              <span
                className="rolling-reel"
                style={{
                  transform: `translateY(calc(-${(alphabet.indexOf(character) + spin) % alphabet.length} * var(--rolling-step, 1em)))`,
                }}
              >
                {Array.from(alphabet).map((glyph) => (
                  <span key={glyph}>{glyph}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={index}>{character}</span>
          );
        })}
      </span>
    </span>
  );
}

function DeleteTypeValue({
  value,
  letters = false,
}: {
  value: string;
  letters?: boolean;
}) {
  const [frame, setFrame] = useState({ text: value, spin: 0 });
  const displayed = useRef(value);
  const lastTarget = useRef(value);
  useEffect(() => {
    if (lastTarget.current === value) return;
    lastTarget.current = value;
    const previous = displayed.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let request: number;
    let start: number | undefined;
    const update = (now: number) => {
      start ??= now;
      const elapsed = now - start;
      const next =
        reduced.matches || elapsed >= 940
          ? { text: value, spin: 0 }
          : axisLabelFrame(previous, value, elapsed);
      displayed.current = next.text;
      setFrame(next);
      if (!reduced.matches && elapsed < 940)
        request = requestAnimationFrame(update);
    };
    request = requestAnimationFrame(update);
    return () => cancelAnimationFrame(request);
  }, [value]);
  return (
    <span aria-label={value}>
      <span aria-hidden="true">
        <RollingValue value={frame.text} spin={frame.spin} letters={letters} />
      </span>
    </span>
  );
}

export function MarketChart({
  token,
  pairedToken,
  onSwitch,
}: {
  token: MarketToken;
  pairedToken: string;
  onSwitch: () => void;
}) {
  const [period, setPeriod] = useState("1H");
  const [style, setStyle] = useState("line");
  const gradient = useId();
  const clip = useId();

  const prices = useMarketPrices();
  const candlesQuery = useMarketCandles(
    token.coin,
    chartIntervalFor(period),
    chartLimitFor(period),
    chartRefetchFor(period)
  );
  const targetCandles = candlesQuery.data?.candles ?? null;

  type PlotFrame = {
    data: ChartSeries | null;
    /** Real (post-animation) candles behind data — the next glide starts here. */
    candles: Candle[];
    progress: number;
    /** While a morph runs: plot to draw (flips old→new as growth starts). */
    plotStyle?: string;
  };
  const [frame, setFrame] = useState<PlotFrame>(() => ({
    data: targetCandles ? buildChartSeries(targetCandles, period) : null,
    candles: targetCandles ?? [],
    progress: 1,
  }));
  const frameRef = useRef(frame);
  const previousCandles = useRef(targetCandles);
  const periodRef = useRef(period);
  const styleRef = useRef(style);
  const morphingRef = useRef(false);
  useEffect(() => {
    const styleChanged = styleRef.current !== style;
    const fromStyle = styleRef.current;
    const periodChanged = periodRef.current !== period;
    styleRef.current = style;
    periodRef.current = period;
    if (previousCandles.current === targetCandles && !styleChanged) {
      morphingRef.current = false;
      return;
    }
    previousCandles.current = targetCandles;
    const previous = frameRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const build = (cs: Candle[] | null) =>
      cs && cs.length ? buildChartSeries(cs, period) : null;
    const nearSame =
      previous.candles.length > 0 &&
      !!targetCandles?.length &&
      Math.abs(previous.candles.length - targetCandles.length) <= 1;

    // Live ticks glide: same window, values move — ease the moving candle
    // into its new position instead of snapping or re-morphing the chart.
    if (!periodChanged && !styleChanged && nearSame && !morphingRef.current) {
      let request: number;
      let start: number | undefined;
      const update = (now: number) => {
        start ??= now;
        const t = reduced.matches ? 1 : Math.min(1, (now - start) / 600);
        const eased = 1 - Math.pow(1 - t, 3);
        const next: PlotFrame = {
          data: build(interpolateCandles(previous.candles, targetCandles!, eased)),
          candles: targetCandles!,
          progress: 1,
          plotStyle: style,
        };
        frameRef.current = next;
        setFrame(next);
        if (t < 1) request = requestAnimationFrame(update);
      };
      request = requestAnimationFrame(update);
      return () => cancelAnimationFrame(request);
    }

    // Period/style switches (and retargets mid-flight) retract the previous
    // plot, then grow the new one — the style flips as growth starts.
    morphingRef.current = true;
    let request: number;
    let start: number | undefined;
    const update = (now: number) => {
      start ??= now;
      const elapsed = now - start;
      const phase = chartTransition(elapsed, previous.progress);
      const { shrinking } = phase;
      const progress = reduced.matches ? 1 : phase.progress;
      const keepOld = shrinking && !reduced.matches;
      const next: PlotFrame = {
        data: keepOld ? previous.data : build(targetCandles),
        candles: keepOld ? previous.candles : targetCandles ?? [],
        progress,
        plotStyle: keepOld ? previous.plotStyle ?? fromStyle : style,
      };
      frameRef.current = next;
      setFrame(next);
      if (!reduced.matches && elapsed < 940) {
        request = requestAnimationFrame(update);
      } else {
        morphingRef.current = false;
      }
    };
    request = requestAnimationFrame(update);
    return () => cancelAnimationFrame(request);
  }, [targetCandles, period, style]);

  const data = frame.data;
  // During a morph the frame carries the plot style (old while retracting,
  // new while growing); otherwise the state style wins.
  const activeStyle = frame.plotStyle ?? style;
  const candleCount = Math.max(1, data?.candles.length ?? 1);
  const bodyWidth = Math.min(14, Math.max(1.5, (600 / candleCount) * 0.72));
  const volumeCount = Math.max(1, data?.volumes.length ?? 1);
  const volumeWidth = Math.min(6, Math.max(0.5, (600 / volumeCount) * 0.7));
  const livePrice = tokenUsdPrice(token, prices.data?.prices);
  const headerPrice = livePrice ?? data?.close ?? null;
  const up = (data?.change ?? 0) >= 0;
  const maxVolume = data ? Math.max(...data.volumes, 0) : 0;
  const totalVolumeUsd = data
    ? data.volumes.reduce((sum, volume, index) => sum + volume * data.values[index], 0)
    : 0;
  const updatedAt = prices.data?.updatedAt ?? candlesQuery.data?.updatedAt ?? null;

  const plot = token.coin ? (
    candlesQuery.isPending ? (
      <div className="market-empty" role="status" aria-label="Loading price chart">
        Loading candles…
      </div>
    ) : candlesQuery.isError && !candlesQuery.data ? (
      <div className="market-empty" role="status">
        Market feed unreachable — is the market service running?
      </div>
    ) : !data ? (
      <div className="market-empty" role="status">
        No candle history yet.
      </div>
    ) : (
      <div className="matcha-plot">
        <svg
          viewBox="0 0 640 300"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Price ${style} chart for ${displaySymbol(token)}, past ${data.duration}. Open ${dollars(data.open)}, latest ${dollars(data.close)}. Auto-scaled vertical axis.${maxVolume > 0 ? " Bottom bars show traded volume." : ""}`}
        >
          <defs>
            <clipPath id={clip}>
              <rect x="20" y="0" width={600 * frame.progress} height="300" />
            </clipPath>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="currentColor" stopOpacity=".18" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((index) => (
            <line
              key={index}
              className="matcha-grid"
              x1="20"
              x2="620"
              y1={25 + index * 52}
              y2={25 + index * 52}
            />
          ))}
          <g clipPath={`url(#${clip})`}>
            <g
              transform={`translate(20 279) scale(1 ${frame.progress}) translate(-20 -279)`}
            >
              {activeStyle === "line" ? (
                <>
                  <path
                    className="market-area"
                    d={`${data.path} L620 275 L20 275 Z`}
                    fill={`url(#${gradient})`}
                  />
                  <path
                    className="exchange-chart-line"
                    d={data.path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : (
                <g className="matcha-candles">
                  {data.candles.map((candle, index) => (
                    <g
                      key={index}
                      className={
                        candle.close >= candle.open
                          ? "candle-up"
                          : "candle-down"
                      }
                    >
                      <line
                        x1={candle.x}
                        x2={candle.x}
                        y1={data.y(candle.high)}
                        y2={data.y(candle.low)}
                      />
                      <rect
                        x={candle.x - bodyWidth / 2}
                        y={Math.min(
                          data.y(candle.open),
                          data.y(candle.close)
                        )}
                        width={bodyWidth}
                        height={Math.max(
                          2,
                          Math.abs(data.y(candle.close) - data.y(candle.open))
                        )}
                      />
                    </g>
                  ))}
                </g>
              )}
              <g className="matcha-volume">
                {data.volumes.map((volume, index) => {
                  const count = data.volumes.length;
                  const height =
                    maxVolume > 0 ? 5 + (volume / maxVolume) * 60 : 0;
                  // Same band centers as the candles/line, so the bars line
                  // up with their candle and none is clipped at the edges.
                  const x = 20 + ((index + 0.5) / count) * 600;
                  return (
                    <rect
                      key={index}
                      x={x - volumeWidth / 2}
                      y={(279 - height).toFixed(3)}
                      width={volumeWidth}
                      height={height.toFixed(3)}
                    />
                  );
                })}
              </g>
            </g>
          </g>
        </svg>
        <div className="matcha-axis" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => {
            const range = data.high - data.low;
            const value =
              data.low -
              range * 0.16 +
              ((230 - (25 + index * 52)) / 210) * range * 1.32;
            return (
              <span
                key={index}
                style={{ top: `${((25 + index * 52) / 300) * 100}%` }}
              >
                <DeleteTypeValue value={formatChartAxis(value, data.close)} />
              </span>
            );
          })}
        </div>
        <div className="matcha-time-labels" aria-hidden="true">
          {data.timeLabels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
      </div>
    )
  ) : (
    <div className="market-empty" role="status">
      Stable value — pegged at $1.00, no chart feed.
    </div>
  );

  return (
    <section
      className="exchange-chart market-chart matcha-chart"
      data-direction={up ? "up" : "down"}
      aria-label={`${displaySymbol(token)} market chart`}
    >
      <div className="matcha-market-header">
        <div className="matcha-token">
          <div className="exchange-asset">
            <span className={`token-mark ${token.color}`}>{token.mark}</span>
            <div>
              <h2>
                <DeleteTypeValue value={displaySymbol(token)} letters />
              </h2>
              <span>
                {token.coin
                  ? "Hyperliquid mark · display only"
                  : "Fuji mock · $1 peg"}
              </span>
            </div>
          </div>
        </div>
        <div className="matcha-metrics" aria-label="Market statistics">
          {[
            {
              label: "Change",
              value: data ? `${up ? "+" : ""}${data.change.toFixed(2)}%` : "—",
            },
            {
              label: "Volume",
              // Mid-folded tick candles carry no traded volume — don't claim $0.
              value: data && totalVolumeUsd > 0 ? compact(totalVolumeUsd) : "—",
            },
            { label: "High", value: data ? dollars(data.high) : "—" },
            {
              label: "Updated",
              value: updatedAt
                ? new Date(updatedAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—",
            },
          ].map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="matcha-price-row">
        <div className="market-value">
          <strong>{headerPrice !== null ? dollars(headerPrice) : "—"}</strong>
          {data && (
            <span
              className="market-change"
              aria-label={`${up ? "Increase" : "Decrease"} ${Math.abs(data.change).toFixed(2)} percent over the past ${data.duration}`}
            >
              {up ? (
                <ArrowUpRightIcon className="market-change-icon" aria-hidden="true" />
              ) : (
                <ArrowDownRightIcon className="market-change-icon" aria-hidden="true" />
              )}
              <RollingValue value={`${Math.abs(data.change).toFixed(2)}%`} />
              <small>past {data.duration}</small>
            </span>
          )}
        </div>
        <div className="matcha-chart-tools">
          <div className="matcha-segment" aria-label="Chart style">
            <button
              aria-label="Line chart"
              aria-pressed={style === "line"}
              onClick={() => setStyle("line")}
            >
              <ArrowTrendingUpIcon />
            </button>
            <button
              aria-label="Candlestick chart"
              aria-pressed={style === "candles"}
              onClick={() => setStyle("candles")}
            >
              <ChartBarIcon />
            </button>
          </div>
        </div>
      </div>
      {plot}
      <div className="matcha-chart-footer">
        <button className="matcha-switch" onClick={onSwitch}>
          <ArrowsRightLeftIcon />
          <span>Switch to {findToken(pairedToken) ? displaySymbol(findToken(pairedToken)!) : pairedToken}</span>
        </button>
        <div
          className="matcha-segment matcha-periods"
          aria-label="Chart timeframe"
        >
          {chartPeriods.map((item) => (
            <button
              key={item}
              aria-pressed={period === item}
              onClick={() => setPeriod(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
