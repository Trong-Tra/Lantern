"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { AppNetwork, type SolverMapProps } from "../app/app-network";
import { paintDeepSky } from "../app/globe-scene";
import { createPlanetModels } from "./planet-models";
import { createPlanetPainter, planets, solverOrbits } from "./solar-scene";
import { createSunPainter } from "./sun-painter";

const ORBIT_SENSITIVITY = .007;
const GLIDE_TIME = 140;

const VIEW_ELEVATION = Math.PI / 12;
const ORBIT_DEPTH_TO_SCREEN_Y = Math.sin(VIEW_ELEVATION);
const ORBIT_DEPTH_TO_CAMERA = Math.cos(VIEW_ELEVATION);

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function SolarNetwork({ demo }: Readonly<{ demo: boolean }>) {
  return <AppNetwork demo={demo} limit={planets.length} map={AgentMap} />;
}

function AgentMap({ agents, selection, onSelect }: SolverMapProps) {
  const stage = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const modelCanvas = useRef<HTMLCanvasElement>(null);
  const markers = useRef(new Map<number, HTMLButtonElement>());
  const azimuth = useRef(0);
  const glideVelocity = useRef(0);
  const zoom = useRef(1);
  const focusZoom = useRef(1);
  const cameraState = useRef({ x: 0, y: 0, zoom: 1, planetZoom: 1 });
  const wake = useRef(() => {});
  const gesture = useRef<{ id: number; x: number; time: number; velocity: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const selectedIndex = agents.findIndex(({ id }) => id === selection.id);
  const roster = useRef({ count: agents.length, selectedIndex, selectedId: selection.id });

  useEffect(() => {
    if (roster.current.selectedId !== selection.id) focusZoom.current = 1;
    roster.current = { count: agents.length, selectedIndex, selectedId: selection.id };
    wake.current();
  }, [agents.length, selectedIndex, selection.id]);

  function zoomBy(factor: number) {
    if (roster.current.selectedIndex >= 0) {
      focusZoom.current = clamp(focusZoom.current * factor, .75, 1.3);
    } else {
      zoom.current = clamp(zoom.current * factor, .75, 2.2);
    }
    wake.current();
  }

  useEffect(() => {
    const element = stage.current;
    const surface = canvas.current;
    const context = surface?.getContext("2d");
    if (!element || !surface || !context) return;

    const panel = element.closest<HTMLElement>(".app-network");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const abort = new AbortController();
    const overlay = modelCanvas.current;
    const models = overlay && createPlanetModels(overlay);
    let modelContextLost = false;
    const painters = planets.map(createPlanetPainter);
    const paintSun = createSunPainter();
    overlay?.addEventListener("webglcontextlost", () => {
      modelContextLost = true;
      requestPaint();
    }, { signal: abort.signal });
    overlay?.addEventListener("webglcontextrestored", () => {
      modelContextLost = false;
      requestPaint();
    }, { signal: abort.signal });
    const positions = solverOrbits.map(({ point }) => point);
    let elapsed = 0;
    let previousFrame = 0;
    const camera = cameraState.current;
    let previousFocus: { index: number; x: number; y: number } | undefined;
    let width = 0;
    let height = 0;
    let frame = 0;

    function requestPaint() {
      if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
    }

    function draw(time: number) {
      frame = 0;
      if (!context || width <= 0 || height <= 0) return;
      const { count, selectedIndex } = roster.current;
      const frameTime = previousFrame ? time - previousFrame : 0;
      if (!motion.matches) {
        elapsed += frameTime;
        const decay = Math.exp(-frameTime / GLIDE_TIME);
        azimuth.current += glideVelocity.current * GLIDE_TIME * (1 - decay);
        glideVelocity.current *= decay;
        if (Math.abs(glideVelocity.current) < .00004) glideVelocity.current = 0;
      } else {
        glideVelocity.current = 0;
      }
      previousFrame = time;
      const base = Math.min(width * .43, height * .86);
      const portrait = width < 600;
      const angle = (portrait ? .89 : -.29) + azimuth.current;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      function project([x, y]: readonly number[], scale: number) {
        const depth = x * sine + y * cosine;
        const perspective = 1 / (1 - depth * ORBIT_DEPTH_TO_CAMERA / 2.15);
        return {
          x: (x * cosine - y * sine) * scale * perspective,
          y: depth * ORBIT_DEPTH_TO_SCREEN_Y * scale * perspective,
          perspective,
        };
      }

      const planetScale = portrait ? 1.06 : 1.42;
      const focused = positions[selectedIndex];
      const focalPoint = focused ? project(focused, base) : null;
      let targetZoom = zoom.current;
      let targetPlanetZoom = clamp(targetZoom, .8, 1.45);
      let targetX = 0;
      let targetY = 0;
      if (focalPoint) {
        const desiredRadius = Math.min(width * .17, height * .15, 106) * focusZoom.current;
        const naturalRadius = planets[selectedIndex].radius * planetScale * focalPoint.perspective;
        targetPlanetZoom = desiredRadius / naturalRadius;
        targetZoom = Math.max(zoom.current, targetPlanetZoom);
        targetX = -focalPoint.x * targetZoom;
        // Reserve room above the planet for its ID card and below it for its label.
        const anchorY = Math.min(height * .79, height - desiredRadius - 40);
        targetY = anchorY - height / 2 - focalPoint.y * targetZoom;
        if (previousFocus?.index === selectedIndex) {
          camera.x += (previousFocus.x - focalPoint.x) * camera.zoom;
          camera.y += (previousFocus.y - focalPoint.y) * camera.zoom;
        }
        previousFocus = { index: selectedIndex, x: focalPoint.x, y: focalPoint.y };
      } else {
        previousFocus = undefined;
      }
      const ease = motion.matches ? 1 : 1 - Math.exp(-Math.min(frameTime, 40) / 115);
      camera.x += (targetX - camera.x) * ease;
      camera.y += (targetY - camera.y) * ease;
      camera.zoom += (targetZoom - camera.zoom) * ease;
      camera.planetZoom += (targetPlanetZoom - camera.planetZoom) * ease;

      const sun = { x: width / 2 + camera.x, y: height / 2 + camera.y };
      const scale = base * camera.zoom;
      const screen = (point: readonly number[]) => {
        const projected = project(point, scale);
        return { ...projected, x: sun.x + projected.x, y: sun.y + projected.y };
      };

      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;
      context.strokeStyle = "#c0a78039";
      for (const { path } of solverOrbits) {
        context.beginPath();
        path.forEach((point, index) => {
          const { x, y } = screen(point);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
        context.stroke();
      }

      const projected = positions.map(screen);
      positions.slice(1, count).forEach(([toX, toY], index) => {
        if (motion.matches) return;
        const [fromX, fromY] = positions[index];
        const dx = toX - fromX;
        const dy = toY - fromY;
        const progress = (elapsed / 2900 + index * .27) % 1;

        function signalPoint(fraction: number) {
          const phase = Math.PI * (1 + fraction);
          const along = (1 + Math.cos(phase)) / 2;
          const bend = Math.sin(phase) * .28;
          return screen([fromX + dx * along - dy * bend, fromY + dy * along + dx * bend]);
        }

        context.save();
        context.strokeStyle = "#eec995";
        for (let dash = 0; dash < 7; dash++) {
          const end = progress - .014 - dash * .034;
          if (end <= 0) break;
          const start = Math.max(0, end - .017);
          const tail = signalPoint(start);
          const middle = signalPoint((start + end) / 2);
          const head = signalPoint(end);
          context.globalAlpha = .8 * (1 - dash / 7) ** 1.7;
          context.beginPath();
          context.moveTo(tail.x, tail.y);
          context.lineTo(middle.x, middle.y);
          context.lineTo(head.x, head.y);
          context.stroke();
        }
        context.restore();

        const dot = signalPoint(progress);
        context.beginPath();
        context.arc(dot.x, dot.y, 1.8, 0, Math.PI * 2);
        context.fillStyle = "#ffdfaa";
        context.fill();
      });
      const sunRadius = clamp(base * .095, 13, 26) * clamp(camera.zoom, .8, 1.45);
      paintSun(context, sun.x, sun.y, sunRadius, elapsed, azimuth.current);

      const radii = projected.map(({ perspective }, index) =>
        Math.min(planets[index].radius * camera.planetZoom * planetScale * perspective, height * .24),
      );
      const footprints = radii.map((radius, index) =>
        radius * (planets[index].name === "Saturn" ? 1.82 : 1),
      );
      projected.forEach(({ x, y }, index) => {
        const selected = index === selectedIndex;
        let separation = 1;
        if (!selected) {
          projected.forEach((other, neighbor) => {
            if (index === neighbor) return;
            const distance = Math.hypot(other.x - x, other.y - y);
            const room = neighbor === selectedIndex ? distance - footprints[neighbor] : distance;
            const combined = footprints[index] + (neighbor === selectedIndex ? 0 : footprints[neighbor]);
            separation = Math.min(separation, clamp(room / (combined + 8), 0, 1));
          });
        }
        const radius = radii[index] * separation;
        if (models && !modelContextLost) {
          models.place(index, x, y, sun.x, sun.y, radius, azimuth.current, VIEW_ELEVATION);
        } else if (radius > 0) {
          painters[index](context, { x, y }, sun, radius, azimuth.current);
        }
        const marker = markers.current.get(index);
        const visible = x >= 0 && x <= width && y >= 0 && y <= height;
        if (marker) {
          marker.hidden = !visible || radius === 0;
          const hitWidth = Math.max(44, footprints[index] * separation * 2);
          const hitHeight = Math.max(44, radius * 2);
          const labelTouchesSun = y <= sun.y
            && Math.hypot(x - sun.x, y + radius + 12 - sun.y) < sunRadius + 12;
          const labelOffset = hitHeight / 2 + (labelTouchesSun ? -radius - 18 : radius + 6);
          marker.style.setProperty("--planet-label-offset", labelOffset + "px");
          marker.style.width = hitWidth + "px";
          marker.style.height = hitHeight + "px";
          marker.style.transform = `translate3d(${x - hitWidth / 2}px, ${y - hitHeight / 2}px, 0)`;
          marker.style.zIndex = selected ? "4" : "2";
        }
        if (selected) {
          panel?.style.setProperty("--pin-x", x + "px");
          panel?.style.setProperty("--pin-y", (y - radius) + "px");
          panel?.style.setProperty("--card-visibility", visible ? "visible" : "hidden");
        }
      });

      if (!modelContextLost) models?.render();
      if (!motion.matches) requestPaint();
    }

    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      models?.resize(width, height, dpr);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const backdrop = sky.current;
      const field = backdrop?.getContext("2d");
      if (backdrop && field) {
        backdrop.width = surface.width;
        backdrop.height = surface.height;
        field.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintDeepSky(field, width, height);
      }
      requestPaint();
    });

    element.addEventListener("wheel", (event) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      zoomBy(Math.exp(-clamp(event.deltaY, -120, 120) * .002));
    }, { passive: false, signal: abort.signal });
    document.addEventListener("visibilitychange", () => {
      previousFrame = 0;
      glideVelocity.current = 0;
      requestPaint();
    }, { signal: abort.signal });
    motion.addEventListener("change", () => {
      previousFrame = 0;
      requestPaint();
    }, { signal: abort.signal });
    resize.observe(element);
    wake.current = requestPaint;
    return () => {
      abort.abort();
      resize.disconnect();
      models?.dispose();
      cancelAnimationFrame(frame);
    };
  }, []);

  function orbitBy(distance: number) {
    azimuth.current = (azimuth.current + distance * ORBIT_SENSITIVITY) % (2 * Math.PI);
    wake.current();
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (active?.id !== event.pointerId) return;
    const dx = event.clientX - active.x;
    if (!active.moved && Math.abs(dx) < 6) return;
    if (!active.moved) {
      active.moved = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    const sampleTime = Math.max(1, event.timeStamp - active.time);
    const speed = clamp(dx * ORBIT_SENSITIVITY / sampleTime, -.006, .006);
    active.velocity += (speed - active.velocity) * (1 - Math.exp(-sampleTime / 32));
    active.time = event.timeStamp;
    orbitBy(dx);
    active.x = event.clientX;
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (active?.id !== event.pointerId) return;
    if (event.type === "pointerup" && active.moved) {
      const releaseDelay = Math.max(0, event.timeStamp - active.time);
      glideVelocity.current = active.velocity * Math.exp(-releaseDelay / 60);
      wake.current();
    }
    gesture.current = null;
    delete event.currentTarget.dataset.dragging;
  }

  return (
    <div className="app-globe">
      <div
        ref={stage}
        className="app-map-canvas app-globe-stage app-solar-stage"
        role="group"
        aria-label="Interactive solar system solver map"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          glideVelocity.current = 0;
          switch (event.key) {
            case "ArrowLeft": orbitBy(-36); break;
            case "ArrowRight": orbitBy(36); break;
            case "+":
            case "=": zoomBy(1.15); break;
            case "-": zoomBy(1 / 1.15); break;
            default: return;
          }
          event.preventDefault();
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          suppressClick.current = false;
          glideVelocity.current = 0;
          gesture.current = { id: event.pointerId, x: event.clientX, time: event.timeStamp, velocity: 0, moved: false };
        }}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(event) => {
          if (!gesture.current?.moved) endDrag(event);
        }}
        onLostPointerCapture={endDrag}
      >
        <canvas ref={sky} aria-hidden="true" />
        <canvas ref={canvas} aria-hidden="true" />
        <canvas ref={modelCanvas} aria-hidden="true" />
        {agents.map(({ id, label }, index) => (
          <button
            key={id}
            className="app-globe-pin app-planet-pin"
            hidden
            type="button"
            aria-label={`Zoom into ${label} and show details`}
            aria-pressed={selection.id === id}
            ref={(element) => {
              if (element) markers.current.set(index, element);
              else markers.current.delete(index);
              wake.current();
            }}
            onClick={(event) => {
              if (suppressClick.current && event.detail !== 0) return;
              onSelect(id);
              wake.current();
            }}
          >
            <span aria-hidden="true">{label}</span>
          </button>
        ))}
      </div>
      <div className="app-globe-toolbar">
        <p>Drag sideways to orbit · Scroll to zoom</p>
      </div>
    </div>
  );
}
