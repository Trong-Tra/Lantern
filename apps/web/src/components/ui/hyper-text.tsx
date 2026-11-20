"use client";

import { useEffect, useState } from "react";
import { cn } from "@/libs/utils";

interface HyperTextProps {
  text: string;
  duration?: number;
  className?: string;
  animateOnLoad?: boolean;
}

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const reducedMotion = "(prefers-reduced-motion: reduce)";

export function HyperText({
  text,
  duration = 800,
  className,
  animateOnLoad = true,
}: HyperTextProps) {
  const [frame, setFrame] = useState({ text, display: text });
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    const preference = window.matchMedia(reducedMotion);
    if (preference.matches || (!animateOnLoad && replay === 0) || !text || duration <= 0) return;

    const start = performance.now();
    const timer = window.setInterval(() => {
      const progress = (performance.now() - start) / duration;
      if (progress >= 1 || preference.matches || document.hidden) {
        setFrame({ text, display: text });
        window.clearInterval(timer);
        return;
      }
      setFrame({
        text,
        display: Array.from(text, (letter, index) =>
          index < progress * text.length || /\s/.test(letter)
            ? letter
            : alphabet[Math.floor(Math.random() * alphabet.length)],
        ).join(""),
      });
    }, 32);

    return () => window.clearInterval(timer);
  }, [text, duration, animateOnLoad, replay]);

  return (
    <span
      className={cn("relative inline-grid whitespace-pre", className)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setReplay((count) => count + 1);
      }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="col-start-1 row-start-1 invisible">
        {text}
      </span>
      <span aria-hidden="true" className="absolute inset-0 motion-reduce:hidden">
        {frame.text === text ? frame.display : text}
      </span>
      <span aria-hidden="true" className="absolute inset-0 hidden motion-reduce:inline">
        {text}
      </span>
    </span>
  );
}
