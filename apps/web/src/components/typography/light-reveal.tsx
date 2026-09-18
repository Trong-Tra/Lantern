"use client";

import { forwardRef } from "react";
import clsx from "clsx";

export interface LightRevealProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly glowColor?: string;
}

export const LightReveal = forwardRef<HTMLDivElement, Readonly<LightRevealProps>>(
  function LightReveal({ children, className, glowColor = "rgba(252, 231, 200, 0.45)" }, ref) {
    return (
      <div
        ref={ref}
        className={clsx(
          "light-reveal-container relative inline-block transition-opacity duration-300",
          className
        )}
        style={{
          // Default CSS vars that can be smoothly tweened by GSAP
          "--light-glow": glowColor,
        } as React.CSSProperties}
      >
        {/* Soft background light wash */}
        <div
          className="light-reveal-halo pointer-events-none absolute -inset-8 -z-10 rounded-full opacity-0 blur-2xl transition-opacity duration-700"
          style={{
            background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`,
          }}
          aria-hidden="true"
        />
        {/* Illuminated text layer */}
        <div className="light-reveal-content relative z-10">{children}</div>
      </div>
    );
  }
);
