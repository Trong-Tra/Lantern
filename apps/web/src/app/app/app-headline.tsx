"use client";

import { useEffect, useState } from "react";
import { TextMorph } from "@/components/ui/text-morph";

const phrases = [
  ["Solver", "network"],
  ["Routes", "compete"],
  ["Track", "records"],
] as const;

export function AppHeadline({ flipUp = false }: Readonly<{ flipUp?: boolean }>) {
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (!reduced.matches && !document.hidden) setTurn((current) => current + 1);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const active = turn % phrases.length;
  const [lead, accent] = phrases[active];
  const [previousLead, previousAccent] = phrases[(active + phrases.length - 1) % phrases.length];
  return (
    <h1 className="app-headline" aria-label="Solver network">
      {phrases.map(([lead, accent]) => (
        <span className="app-headline-measure" key={lead} aria-hidden="true">
          {lead} <em>{accent}</em>
        </span>
      ))}
      {flipUp ? (
        <span className="app-headline-morph app-headline-flip" key={turn} aria-hidden="true">
          {turn > 0 && (
            <span className="app-headline-flip-out">
              {previousLead} <em>{previousAccent}</em>
            </span>
          )}
          <span className={turn > 0 ? "app-headline-flip-in" : undefined}>
            {lead} <em>{accent}</em>
          </span>
        </span>
      ) : (
        <span className="app-headline-morph" aria-hidden="true">
          <TextMorph as="span">{lead}</TextMorph>{" "}
          <TextMorph as="em">{accent}</TextMorph>
        </span>
      )}
    </h1>
  );
}
