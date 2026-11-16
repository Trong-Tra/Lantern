"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
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
  getChartData,
  formatChartAxis,
  axisLabelFrame,
  mockMarkets,
} from "./chart-data";

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
  mock,
  pairedToken,
  onSwitch,
}: {
  token: { symbol: string; name: string; color: string; mark: string };
  mock: boolean;
  pairedToken: string;
  onSwitch: () => void;
}) {
  const [period, setPeriod] = useState("1D");
  const [selected, setSelected] = useState<number | null>(null);
  const [style, setStyle] = useState("line");
  const [metric, setMetric] = useState("price");
  const gradient = useId();
  const target = useMemo(
    () => getChartData(token.symbol, period),
    [token.symbol, period]
  );
  const [frame, setFrame] = useState({ data: target, progress: 1 });
  const frameRef = useRef(frame);
  const previousTarget = useRef(target);
  const clip = useId();
  useEffect(() => {
    if (previousTarget.current === target) return;
    previousTarget.current = target;
    const previous = frameRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let request: number;
    let start: number | undefined;
    const update = (now: number) => {
      start ??= now;
      const elapsed = now - start;
      const phase = chartTransition(elapsed, previous.progress);
      const { shrinking } = phase;
      const progress = reduced.matches ? 1 : phase.progress;
      const next = {
        data: shrinking && !reduced.matches ? previous.data : target,
        progress,
      };
      frameRef.current = next;
      setFrame(next);
      if (!reduced.matches && elapsed < 940)
        request = requestAnimationFrame(update);
    };
    request = requestAnimationFrame(update);
    return () => cancelAnimationFrame(request);
  }, [target]);
  const data = frame.data;
  const market = mockMarkets[token.symbol];
  const cap = metric === "cap";
  const format = (value: number) =>
    cap ? compact(value * market.supply) : dollars(value);
  const point = data.points[selected ?? 48];
  const up = target.change >= 0;
  function inspect(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 640;
    setSelected(Math.max(0, Math.min(48, Math.round(((x - 20) / 600) * 48))));
  }

  return (
    <section
      className="exchange-chart market-chart matcha-chart"
      data-direction={up ? "up" : "down"}
      aria-label={`${token.name} market chart`}
    >
      <div className="matcha-market-header">
        <div className="matcha-token">
          <div className="exchange-asset">
            <span className={`token-mark ${token.color}`}>{token.mark}</span>
            <div>
              <h2>
                <DeleteTypeValue value={token.name} letters />
              </h2>
              <span>{token.symbol} · Monad</span>
            </div>
          </div>
          {!mock && <span className="exchange-preview">UI preview</span>}
        </div>
        <div className="matcha-metrics" aria-label="Market statistics">
          {[
            {
              label: "Market cap",
              value: compact(target.close * market.supply),
            },
            { label: "24h Volume", value: compact(market.volume) },
            { label: "Holders", value: market.holders },
            { label: "Age", value: market.age },
          ].map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{mock ? item.value : "—"}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="matcha-price-row">
        <div className="market-value">
          <strong>{mock ? format(data.close) : "—"}</strong>
          {mock && (
            <span className="market-change" aria-label={`${up ? "Increase" : "Decrease"} ${Math.abs(target.change).toFixed(2)} percent over the past ${data.duration}`}>
              {up ? <ArrowUpRightIcon className="market-change-icon" aria-hidden="true" /> : <ArrowDownRightIcon className="market-change-icon" aria-hidden="true" />}
              <RollingValue value={`${Math.abs(target.change).toFixed(2)}%`} />
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
          <div className="matcha-segment" aria-label="Chart metric">
            <button aria-pressed={!cap} onClick={() => setMetric("price")}>
              Price
            </button>
            <button aria-pressed={cap} onClick={() => setMetric("cap")}>
              MCap
            </button>
          </div>
        </div>
      </div>
      {mock ? (
        <div className="matcha-plot">
          <svg
            viewBox="0 0 640 300"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Mock ${metric === "cap" ? "market cap" : "price"} ${style} chart for ${token.name}, past ${data.duration}. Open ${format(data.open)}, latest ${format(data.close)}. Auto-scaled vertical axis. Bottom bars show mock trading volume.`}
            onPointerMove={(event) => {
              if (event.pointerType !== "touch") inspect(event);
            }}
            onPointerDown={inspect}
            onPointerLeave={() => setSelected(null)}
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
                {style === "line" ? (
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
                          x={candle.x - 7}
                          y={Math.min(
                            data.y(candle.open),
                            data.y(candle.close)
                          )}
                          width="14"
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
                  {data.values.map((value, index) => {
                    const volume =
                      5 +
                      Math.abs(
                        Math.sin(index * 13.7 + chartPeriods.indexOf(period))
                      ) *
                        22 +
                      (Math.abs(value - (data.values[index - 1] ?? value)) /
                        (data.high - data.low)) *
                        90;
                    return (
                      <rect
                        key={index}
                        x={16 + (index / 48) * 600}
                        y={(279 - volume).toFixed(3)}
                        width="8"
                        height={volume.toFixed(3)}
                      />
                    );
                  })}
                </g>
              </g>
            </g>
            {selected !== null && frame.progress === 1 && (
              <g>
                <line
                  className="market-crosshair"
                  x1={point.x}
                  x2={point.x}
                  y1="12"
                  y2="279"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="currentColor"
                  stroke="#11100e"
                  strokeWidth="2"
                />
              </g>
            )}
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
                  <DeleteTypeValue
                    value={formatChartAxis(
                      value,
                      data.close,
                      cap ? market.supply : undefined
                    )}
                  />
                </span>
              );
            })}
          </div>
          <div className="matcha-time-labels" aria-hidden="true">
            {data.timeLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="market-empty">Market data is not connected.</div>
      )}
      <div className="matcha-chart-footer">
        <button className="matcha-switch" onClick={onSwitch}>
          <ArrowsRightLeftIcon />
          <span>Switch to {pairedToken}</span>
        </button>
        <div
          className="matcha-segment matcha-periods"
          aria-label="Chart timeframe"
        >
          {chartPeriods.map((item) => (
            <button
              key={item}
              aria-pressed={period === item}
              onClick={() => {
                setPeriod(item);
                setSelected(null);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

