"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AppNetwork, type SolverMapProps } from "./app-network";
import { globePoint, globeProjection, globeRadius, loadLand, makeFlight, paintGlobe } from "./globe-scene";
import { diskGeometry, paintAccretion, paintGlobeBackdrop } from "./globe-backdrop";

const transmissions = [
  "If you can read this, the lantern is still lit.",
  "We threw a stopwatch in here. It’s still thinking about it.",
  "A solver found a shortcut through spacetime. The return route is still pending.",
];

const locations = [
  [103.8, 12], [36.8, -1.3], [13.4, 52.5], [139.7, 35.7],
  [-73.9, 40.7], [-46.6, -23.6], [77.2, 28.6], [151.2, -33.9],
  [-122.4, 37.8], [-0.1, 51.5],
] as const;
const rad = Math.PI / 180;
const rotationPerPixel = 0.0038;
const dragVelocityResponseMs = 72;
const coastDecayMs = 370;
const maxDragSpeed = 0.0035;
const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function GlobeNetwork({ demo, standings }: Pick<Parameters<typeof AppNetwork>[0], "demo" | "standings">) {
  return <AppNetwork demo={demo} standings={standings} limit={locations.length} map={GlobeMap} rankFirst />;
}

function GlobeMap({ agents, selection, onSelect, onDismiss }: SolverMapProps) {
  const stage = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const blackHole = useRef<HTMLButtonElement>(null);
  const transmissionDialog = useRef<HTMLDialogElement>(null);
  const [transmission, setTransmission] = useState(-1);
  const markers = useRef(new Map<string, HTMLButtonElement>());
  const camera = useRef({ yaw: -91 * rad, zoom: 1, centerY: 0.51 });
  const velocity = useRef(0);
  const zoom = useRef(1);
  const wake = useRef(() => {});
  const gesture = useRef<{
    id: number; x: number; time: number; speed: number; moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const roster = useMemo(
    () => agents.slice(0, locations.length).map(({ id }, index) => {
      const [longitude, latitude] = locations[index];
      const yaw = -longitude * rad;
      const point = globePoint(longitude, latitude);
      return { id, yaw, point, focusY: globeProjection(yaw)(point).y };
    }),
    [agents],
  );
  const current = useRef({ roster, selectedId: selection.id });

  useEffect(() => {
    current.current = { roster, selectedId: selection.id };
    wake.current();
  }, [roster, selection.id]);

  useEffect(() => {
    const element = stage.current;
    const surface = canvas.current;
    const backdrop = sky.current;
    const context = surface?.getContext("2d");
    const field = backdrop?.getContext("2d");
    if (!element || !surface || !backdrop || !context || !field) return;

    const panel = element.closest<HTMLElement>(".app-network");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const abort = new AbortController();
    const view = camera.current;
    let land: Awaited<ReturnType<typeof loadLand>> = [];
    let flights: ReturnType<typeof makeFlight>[] = [];
    let flightRoster: typeof roster = [];
    let flightPoints: typeof roster[number]["point"][] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let elapsed = 0;

    function requestPaint() {
      if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
    }

    function draw(time: number) {
      frame = 0;
      if (!context || !width || !height) return;
      const dt = previous ? Math.min(48, time - previous) : 16;
      previous = time;
      const still = motion.matches;
      if (!still) elapsed += dt;
      const { roster: nodes, selectedId } = current.current;
      const selected = nodes.find(({ id }) => id === selectedId);
      const ease = still ? 1 : 1 - Math.exp(-dt / 120);

      if (selected) {
        view.yaw += wrapAngle(selected.yaw - view.yaw) * ease;
      } else if (!still && !gesture.current) {
        const coast = Math.exp(-dt / coastDecayMs);
        view.yaw += 0.000075 * dt + velocity.current * coastDecayMs * (1 - coast);
        velocity.current *= coast;
      }
      view.yaw = wrapAngle(view.yaw);
      const targetZoom = zoom.current * (selected ? (width < 600 ? 1.232 : 1.342) : 1);
      // Leave room for the portrait card above and the globe controls below the pin.
      const pinClearance = height < 380 ? 38 : 58;
      const restingPinY = clamp(530, height * 0.69, height - pinClearance);
      let focusPinY = restingPinY;
      const card = selected && panel?.querySelector<HTMLElement>(".app-agent-overlay");
      if (card && panel) {
        const leaderHeight = Number.parseFloat(getComputedStyle(panel, "::after").height) || 0;
        const minimumPinY = Math.min(restingPinY, card.offsetHeight + leaderHeight + 8);
        focusPinY = Math.max(minimumPinY, restingPinY - height * 0.25);
      }
      const targetCenterY = selected
        ? (focusPinY + selected.focusY * globeRadius(width, height, targetZoom)) / height
        : 0.51;
      view.zoom += (targetZoom - view.zoom) * ease;
      view.centerY += (targetCenterY - view.centerY) * ease;

      if (nodes !== flightRoster) {
        flightRoster = nodes;
        flightPoints = nodes.map(({ point }) => point);
        flights = flightPoints.length < 2 ? [] : Array.from({ length: 4 }, (_, index) =>
          makeFlight(flightPoints, elapsed + index * 570),
        );
      }
      if (!still && flights.length) {
        flights.forEach((flight, index) => {
          if (elapsed > flight.start + flight.duration + 700) {
            flights[index] = makeFlight(flightPoints, elapsed + 140);
          }
        });
      }

      const { project, cx, cy, radius } = paintGlobe(
        context, width, height, view.yaw, land, flights, elapsed, still,
        view.zoom, view.centerY,
        () => { if (!still) paintAccretion(context, width, height, elapsed); },
      );

      for (const { id, point } of nodes) {
        const marker = markers.current.get(id);
        if (!marker) continue;
        const projected = project(point);
        const x = cx + projected.x * radius;
        const y = cy - projected.y * radius;
        const visible = projected.z > 0.06 && x >= 0 && x <= width && y >= 0 && y <= height;
        marker.hidden = !visible;
        marker.style.transform = `translate3d(${x - 22}px, ${y - 22}px, 0)`;
        marker.style.zIndex = id === selectedId ? "2" : "1";
        if (id === selectedId) {
          panel?.style.setProperty("--pin-x", x + "px");
          panel?.style.setProperty("--pin-y", y + "px");
          panel?.style.setProperty("--card-visibility", visible ? "visible" : "hidden");
        }
      }
      if (!still) requestPaint();
    }

    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = backdrop.width = Math.round(width * dpr);
      surface.height = backdrop.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      field.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintGlobeBackdrop(field, width, height);
      const target = blackHole.current;
      if (target) {
        const { x, y, radius } = diskGeometry(width, height);
        target.style.left = `${x}px`;
        target.style.top = `${y}px`;
        target.style.width = `${Math.max(44, radius * 1.78)}px`;
        target.hidden = false;
      }
      requestPaint();
    });
    resize.observe(element);
    wake.current = requestPaint;
    loadLand(abort.signal).then((points) => {
      if (abort.signal.aborted) return;
      land = points;
      requestPaint();
    }).catch(() => {
      // The ocean, grid and markers remain usable if the atlas cannot load.
    });
    element.addEventListener("wheel", (event) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      zoom.current = clamp(zoom.current * Math.exp(-clamp(event.deltaY, -120, 120) * 0.002), 0.7, 1.75);
      requestPaint();
    }, { passive: false, signal: abort.signal });
    document.addEventListener("visibilitychange", () => {
      previous = 0;
      requestPaint();
    }, { signal: abort.signal });
    motion.addEventListener("change", () => {
      previous = 0;
      velocity.current = 0;
      requestPaint();
    }, { signal: abort.signal });

    return () => {
      abort.abort();
      resize.disconnect();
      cancelAnimationFrame(frame);
      wake.current = () => {};
    };
  }, []);

  function drag(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (active?.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    if (!active.moved && Math.abs(dx) < 6) return;
    if (!active.moved) {
      active.moved = true;
      suppressClick.current = true;
      if (selection.id) onDismiss();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    const dt = Math.max(1, event.timeStamp - active.time);
    active.speed += (clamp(dx * rotationPerPixel / dt, -maxDragSpeed, maxDragSpeed) - active.speed)
      * (1 - Math.exp(-dt / dragVelocityResponseMs));
    camera.current.yaw += dx * rotationPerPixel;
    active.x = event.clientX;
    active.time = event.timeStamp;
    wake.current();
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (active?.id !== event.pointerId) return;
    if (active.moved && event.type === "pointerup") {
      velocity.current = active.speed * Math.exp(-Math.max(0, event.timeStamp - active.time) / 70);
    }
    gesture.current = null;
    delete event.currentTarget.dataset.dragging;
    wake.current();
  }

  return (
    <div className="app-globe">
      <div
        ref={stage}
        className="app-map-canvas app-globe-stage"
        role="group"
        aria-label="Interactive solver globe"
        aria-describedby="solver-globe-caption"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          switch (event.key) {
            case "ArrowLeft": camera.current.yaw -= 0.25; break;
            case "ArrowRight": camera.current.yaw += 0.25; break;
            case "+":
            case "=": zoom.current = clamp(zoom.current * 1.15, 0.7, 1.75); break;
            case "-": zoom.current = clamp(zoom.current / 1.15, 0.7, 1.75); break;
            default: return;
          }
          if (event.key.startsWith("Arrow") && selection.id) onDismiss();
          event.preventDefault();
          wake.current();
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          suppressClick.current = false;
          velocity.current = 0;
          gesture.current = {
            id: event.pointerId, x: event.clientX,
            time: event.timeStamp, speed: 0, moved: false,
          };
        }}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(event) => { if (!gesture.current?.moved) endDrag(event); }}
        onLostPointerCapture={endDrag}
      >
        <canvas ref={sky} aria-hidden="true" />
        <canvas ref={canvas} aria-hidden="true" />
        <button
          ref={blackHole}
          className="app-black-hole-trigger"
          type="button"
          hidden
          aria-label="Investigate the black hole"
          aria-haspopup="dialog"
          onClick={(event) => {
            if (suppressClick.current && event.detail !== 0) return;
            setTransmission((previous) => (previous + 1) % transmissions.length);
            transmissionDialog.current?.showModal();
          }}
        />
        {agents.map(({ id, label }) => (
          <button
            key={id}
            ref={(marker) => {
              if (marker) markers.current.set(id, marker);
              else markers.current.delete(id);
            }}
            className="app-globe-pin"
            hidden
            type="button"
            aria-label={`Show ${label} details`}
            aria-pressed={selection.id === id}
            onClick={(event) => {
              if (!suppressClick.current || event.detail === 0) onSelect(id);
            }}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
      <dialog
        ref={transmissionDialog}
        className="app-transmission"
        aria-labelledby="app-transmission-title"
        aria-describedby="app-transmission-message"
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
      >
        <h2 id="app-transmission-title">Signal from the event horizon</h2>
        <p id="app-transmission-message">{transmissions[transmission]}</p>
        <form method="dialog">
          <button type="submit">Return to the globe</button>
        </form>
      </dialog>
      <div className="app-globe-toolbar">
        <p id="solver-globe-caption">Solver locations and flight paths are illustrative.</p>
      </div>
    </div>
  );
}
