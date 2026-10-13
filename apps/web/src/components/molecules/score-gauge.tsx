/**
 * Radial "lumen" gauge for the v1 lumen score — the network page's light
 * metaphor: earned trust emits light. Server-safe (pure SVG + CSS; the
 * arc ignites via the lantern-ignite keyframe on stroke-dashoffset).
 * score = 100 × A × V (apps/api/src/repositories/scoring.ts).
 * Absent score renders a dim "N/A" — no invented light.
 */
import type { CSSProperties } from "react";
export function ScoreGauge({ score, size = 64 }: { score?: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value =
    typeof score === "number" && !Number.isNaN(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : null;
  const arc = value === null ? 0 : (value / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={value === null ? "No score yet" : `Lumen score ${value} of 100`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(239, 232, 216, 0.10)"
          strokeWidth={stroke}
        />
        {value !== null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#ffc46b"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - arc}
            className="gauge-arc"
            style={
              {
                "--gauge-c": circumference,
                "--gauge-to": circumference - arc,
                filter: "drop-shadow(0 0 6px rgba(255, 196, 107, 0.45))",
              } as CSSProperties
            }
          />
        ) : null}
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono text-sm ${
          value === null ? "text-paper/35" : "text-paper"
        }`}
      >
        {value === null ? "N/A" : value}
      </span>
    </div>
  );
}
