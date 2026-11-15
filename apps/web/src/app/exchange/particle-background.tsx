"use client";

import { useEffect, useRef } from "react";

/** Decorative accelerator tracks; no pointer handlers or UI state. */
export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let frame = 0;
    let previous = 0;
    let clock = 0;
    const particles = Array.from({ length: 36 }, (_, index) => ({
      phase: Math.random() * Math.PI * 2,
      speed: (0.25 + Math.random() * 0.4) * (index % 2 ? 1 : -1),
      radius: 0.15 + Math.random() * 0.35,
      centerX: 0.1 + Math.random() * 0.8,
      centerY: 0.05 + Math.random() * 0.9,
      tilt: (Math.random() - 0.5) * 1.1,
      hue: index % 5 === 0 ? 260 : 38,
      flash: 0,
    }));
    const stars = Array.from({ length: 65 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.6 + Math.random() * 0.8,
    }));

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now: number, still = false) {
      if (!still) frame = requestAnimationFrame(draw);
      if (!still && now - previous < 1000 / 30) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.06) : 0;
      previous = now;
      clock += dt;
      context!.clearRect(0, 0, width, height);
      for (const star of stars) {
        context!.fillStyle = "rgba(240, 209, 155, 0.55)";
        context!.beginPath();
        context!.arc(
          star.x * width,
          star.y * height,
          star.size,
          0,
          Math.PI * 2
        );
        context!.fill();
      }
      const count = width < 760 ? 18 : particles.length;
      for (const particle of particles.slice(0, count)) {
        particle.phase += dt * particle.speed;
        // Sparse local blooms, never a full-screen flash.
        if (Math.random() < dt * 0.06) particle.flash = 1;
        particle.flash = Math.max(0, particle.flash - dt * 0.9);
        const point = (phase: number) => {
          const x = Math.cos(phase) * width * particle.radius;
          const y = Math.sin(phase) * height * particle.radius * 0.5;
          return {
            x:
              width * particle.centerX +
              x * Math.cos(particle.tilt) -
              y * Math.sin(particle.tilt),
            y:
              height * particle.centerY +
              x * Math.sin(particle.tilt) +
              y * Math.cos(particle.tilt),
          };
        };
        const head = point(particle.phase);
        for (let segment = 0; segment < 12; segment++) {
          const direction = Math.sign(particle.speed);
          const from = point(particle.phase - segment * 0.012 * direction);
          const to = point(particle.phase - (segment + 1) * 0.012 * direction);
          context!.beginPath();
          context!.moveTo(from.x, from.y);
          context!.lineTo(to.x, to.y);
          context!.strokeStyle = `hsla(${particle.hue}, 75%, 78%, ${(1 - segment / 12) * 0.85})`;
          context!.lineWidth = 1.2;
          context!.stroke();
        }
        const glow = context!.createRadialGradient(
          head.x,
          head.y,
          0,
          head.x,
          head.y,
          10 + particle.flash * 22
        );
        glow.addColorStop(
          0,
          `hsla(${particle.hue}, 90%, 82%, ${0.7 + particle.flash * 0.3})`
        );
        glow.addColorStop(
          0.18,
          `hsla(${particle.hue}, 85%, 65%, ${0.15 + particle.flash * 0.2})`
        );
        glow.addColorStop(1, `hsla(${particle.hue}, 80%, 55%, 0)`);
        context!.fillStyle = glow;
        context!.beginPath();
        context!.arc(head.x, head.y, 10 + particle.flash * 22, 0, Math.PI * 2);
        context!.fill();
        context!.fillStyle = `hsla(${particle.hue}, 75%, 88%, ${0.65 + Math.sin(clock + particle.phase) * 0.15})`;
        context!.beginPath();
        context!.arc(head.x, head.y, 1.6 + particle.flash, 0, Math.PI * 2);
        context!.fill();
      }
    }

    function syncMotion() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (document.hidden) {
        context!.clearRect(0, 0, width, height);
        return;
      }
      if (motion.matches) {
        draw(0, true);
        return;
      }
      frame = requestAnimationFrame(draw);
    }
    resize();
    syncMotion();
    const onResize = () => {
      resize();
      syncMotion();
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", syncMotion);
    motion.addEventListener("change", syncMotion);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", syncMotion);
      motion.removeEventListener("change", syncMotion);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="exchange-particles"
        aria-hidden="true"
      />
      <div className="exchange-matte" aria-hidden="true" />
    </>
  );
}
