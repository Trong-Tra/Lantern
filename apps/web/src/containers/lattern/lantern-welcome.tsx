"use client";
import { useEffect, useRef } from "react";
import {
  journeyState,
  ignitionReveal,
  ease,
} from "@/libs/cinematic/chapter-transition";
const VISITED = "lattern-lantern-welcome";
export function LanternWelcome({
  disabled,
  ready,
  onComplete,
}: {
  disabled: boolean;
  ready: boolean;
  onComplete: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let visited = false;
    try {
      visited = sessionStorage.getItem(VISITED) === "1";
    } catch {}
    if (disabled || visited || location.hash || window.scrollY > 0) {
      onComplete();
      return;
    }
    const content = document.querySelector<HTMLElement>("main.myth");
    const overflow = document.body.style.overflow;
    if (content) content.inert = true;
    document.body.style.overflow = "hidden";
    if (ready) {
      journeyState.entranceAt = 0;
      journeyState.ignitionAt = performance.now();
    }
    const timer = ready
      ? window.setTimeout(() => {
          try {
            sessionStorage.setItem(VISITED, "1");
          } catch {}
          onComplete();
        }, 6000)
      : undefined;

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = overflow;
      if (content) content.inert = false;
    };
  }, [disabled, ready, onComplete]);

  useEffect(() => {
    if (!canvas.current) return;
    const surface = canvas.current;
    const ctx = surface.getContext("2d");
    if (!ctx) return;
    const width = innerWidth,
      height = innerHeight;
    const dpr = Math.min(devicePixelRatio, 1.25);
    surface.width = width * dpr;
    surface.height = height * dpr;
    ctx.scale(dpr, dpr);
    // Sample the welcome glyphs once; each luminous pixel becomes a falling spark.
    const glyphs = document.createElement("canvas");
    glyphs.width = 280;
    glyphs.height = 24;
    const ink = glyphs.getContext("2d");
    const sparks: { x: number; y: number; seed: number }[] = [];
    if (ink) {
      ink.font = "14px Georgia";
      ink.textAlign = "center";
      ink.fillText("Gathering a little light.", 140, 17);
      const pixels = ink.getImageData(0, 0, 280, 24).data;
      for (let y = 0; y < 24; y += 3)
        for (let x = 0; x < 280; x += 3)
          if (pixels[(y * 280 + x) * 4 + 3] > 80)
            sparks.push({
              x: width / 2 - 140 + x,
              y: height * 0.2 + y,
              seed: ((x * 37 + y * 13) % 101) / 101,
            });
    }
    let frame = 0;
    const draw = () => {
      const seconds =
        journeyState.ignitionAt > 0
          ? (performance.now() - journeyState.ignitionAt) / 1000
          : 0;
      const ignition = ignitionReveal(seconds);
      const cx = journeyState.candleScreenX * width,
        cy = journeyState.candleScreenY * height;
      ctx.clearRect(0, 0, width, height);
      // A feathered pool of visibility expands from the candle through the darkness.
      const radius = 180 + ignition.space * Math.hypot(width, height);
      const veil = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.35,
        cx,
        cy,
        radius
      );
      veil.addColorStop(0, "rgba(3,5,8,0)");
      veil.addColorStop(0.55, "rgba(3,5,8,0.25)");
      veil.addColorStop(1, "rgba(3,5,8,1)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, width, height);
      if (ignition.flame > 0) {
        const halo = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          90 + ignition.space * 250
        );
        halo.addColorStop(0, `rgba(255,174,65,${0.16 * ignition.flame})`);
        halo.addColorStop(0.35, `rgba(235,132,35,${0.07 * ignition.flame})`);
        halo.addColorStop(1, "rgba(235,132,35,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, width, height);
      }
      if (label.current)
        label.current.style.opacity = String(1 - ease((seconds - 0.8) / 0.45));
      for (const spark of sparks) {
        const t = Math.max(
          0,
          Math.min(1, (seconds - 0.85 - spark.seed * 0.3) / 1.15)
        );
        if (t <= 0 || t >= 1) continue;
        const fall = t * t;
        const x =
          spark.x +
          (cx - spark.x) * ease(t) +
          Math.sin(t * Math.PI) * (spark.seed - 0.5) * 100;
        const y = spark.y + (cy - spark.y) * fall;
        ctx.globalAlpha = Math.sin(Math.PI * t) * 0.9;
        ctx.fillStyle = "#ffe7a4";
        ctx.fillRect(x, y, 1.6, 1.6);
        ctx.globalAlpha *= 0.15;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      surface.style.opacity = String(1 - ignition.settle);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [ready]);
  return (
    <div className="lantern-welcome">
      <canvas
        ref={canvas}
        className="lantern-welcome-light"
        aria-hidden="true"
      />
      <p ref={label} className="lantern-welcome-label">
        Gathering a little light.
      </p>
      <button
        onClick={() => {
          try {
            sessionStorage.setItem(VISITED, "1");
          } catch {}
          onComplete();
        }}
      >
        Read the story
      </button>
    </div>
  );
}
