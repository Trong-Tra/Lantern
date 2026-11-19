"use client";

import { useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Marker,
} from "react-simple-maps";
import type { AgentPin } from "@/libs/app/network";

const GEO_URL = "/maps/land-110m.json";

type Props = {
  pins: AgentPin[];
};

type HoverState = {
  pin: AgentPin;
  x: number;
  y: number;
};

/**
 * Illustrative world map of agent pins. Host locations are decorative —
 * we do not claim where agents run (see page disclaimer).
 * Land topology: world-atlas land-110m served from /public/maps.
 */
export function AgentMap({ pins }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  function showPin(pin: AgentPin, target: EventTarget & SVGElement) {
    const wrap = wrapRef.current;
    const svg = target.ownerSVGElement;
    if (!wrap || !svg) return;
    // Marker elements are SVGGElement; getScreenCTM lives on SVGGraphicsElement.
    const ctm = (target as SVGGraphicsElement).getScreenCTM?.();
    if (!ctm) return;
    const origin = svg.createSVGPoint();
    origin.x = 0;
    origin.y = 0;
    const screen = origin.matrixTransform(ctm);
    const wrapRect = wrap.getBoundingClientRect();
    setHover({ pin, x: screen.x - wrapRect.left, y: screen.y - wrapRect.top });
  }

  return (
    <div className="app-map-canvas" ref={wrapRef}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 145, center: [0, 12] }}
        role="img"
        aria-label={
          pins.length
            ? `World map with ${pins.length} illustrative agent pins`
            : "World map"
        }
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography key={geo.rsmKey} geography={geo} className="app-map-land" />
            ))
          }
        </Geographies>
        <Graticule className="app-map-graticule" />
        {pins.map((pin) => (
          <Marker
            key={pin.agentId}
            coordinates={[pin.longitude, pin.latitude]}
            tabIndex={0}
            aria-label={`Agent ${pin.agentId} — illustrative pin near ${pin.label}`}
            onMouseEnter={(event) => showPin(pin, event.currentTarget)}
            onMouseLeave={() => setHover(null)}
            onFocus={(event) => showPin(pin, event.currentTarget)}
            onBlur={() => setHover(null)}
          >
            <circle r={10} className="app-map-pin-halo" />
            <circle r={5} className="app-map-pin" />
          </Marker>
        ))}
      </ComposableMap>
      {hover && (
        <div
          className="app-map-tip"
          style={{ left: hover.x, top: hover.y }}
          role="status"
        >
          <strong>Agent {hover.pin.agentId}</strong>
          <span>{hover.pin.label} · illustrative</span>
        </div>
      )}
      {pins.length === 0 && (
        <p className="app-map-empty">
          No agents indexed yet — the map lights up when the registry has identities.
        </p>
      )}
    </div>
  );
}
