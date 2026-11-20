"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/libs/utils";

type TextMorphProps = {
  children: string;
  as?: "p" | "span" | "em";
  className?: string;
  style?: CSSProperties;
};

export function TextMorph({ children, as: Component = "p", className, style }: TextMorphProps) {
  const text = useRef<HTMLSpanElement>(null);
  const exits = useRef<HTMLSpanElement>(null);
  const previous = useRef(new Map<string, { x: number; y: number; letter: string }>());
  const counts = new Map<string, number>();
  const characters = Array.from(children, (letter) => {
    const normalized = letter.toLowerCase();
    const count = (counts.get(normalized) ?? 0) + 1;
    counts.set(normalized, count);
    return { id: `${normalized}:${count}`, letter };
  });

  useLayoutEffect(() => {
    const glyphs = text.current?.querySelectorAll<HTMLElement>("[data-glyph]");
    if (!glyphs || !text.current || !exits.current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const origin = text.current.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number; letter: string }>();
    const animations: Animation[] = [];
    const departing: HTMLElement[] = [];

    for (const glyph of glyphs) {
      const id = glyph.dataset.glyph!;
      const bounds = glyph.getBoundingClientRect();
      const position = { x: bounds.x - origin.x, y: bounds.y - origin.y, letter: glyph.textContent ?? "" };
      next.set(id, position);
      if (reduced || !previous.current.size) continue;

      const from = previous.current.get(id);
      if (from && from.x === position.x && from.y === position.y) continue;
      animations.push(
        glyph.animate(
          [from
            ? { transform: `translate(${from.x - position.x}px, ${from.y - position.y}px)` }
            : { opacity: 0 },
          { transform: "none", opacity: 1 }],
          { duration: 520, easing: "cubic-bezier(.22, 1.25, .36, 1)" },
        ),
      );
    }

    if (!reduced) {
      for (const [id, { x, y, letter }] of previous.current) {
        if (next.has(id)) continue;
        const glyph = document.createElement("span");
        glyph.textContent = letter;
        Object.assign(glyph.style, { position: "absolute", left: `${x}px`, top: `${y}px` });
        exits.current.append(glyph);
        departing.push(glyph);
        const animation = glyph.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 });
        animation.onfinish = () => glyph.remove();
        animations.push(animation);
      }
    }

    previous.current = next;
    return () => {
      animations.forEach((animation) => animation.cancel());
      departing.forEach((glyph) => glyph.remove());
    };
  }, [children]);

  return (
    <Component className={cn(className)} style={style}>
      <span className="sr-only">{children}</span>
      <span ref={text} className="relative inline-block whitespace-pre" aria-hidden="true">
        {characters.map(({ id, letter }) => (
          <span key={id} className="inline-block" data-glyph={id}>{letter}</span>
        ))}
        <span ref={exits} className="pointer-events-none absolute inset-0" />
      </span>
    </Component>
  );
}
