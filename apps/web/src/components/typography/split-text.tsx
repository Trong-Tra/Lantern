"use client";

import { useMemo } from "react";
import clsx from "clsx";

export interface SplitTextProps {
  readonly children: string;
  readonly type?: "chars" | "words" | "lines";
  readonly className?: string;
  readonly charClassName?: string;
  readonly wordClassName?: string;
}

export function SplitText({
  children,
  type = "words",
  className,
  charClassName,
  wordClassName,
}: Readonly<SplitTextProps>) {
  const words = useMemo(() => children.split(" "), [children]);

  if (type === "chars") {
    return (
      <span className={clsx("inline-block", className)} aria-label={children}>
        {words.map((word, wordIdx) => (
          <span
            key={`w-${wordIdx}`}
            className={clsx("inline-block whitespace-nowrap", wordClassName)}
            aria-hidden="true"
          >
            {word.split("").map((char, charIdx) => (
              <span
                key={`c-${wordIdx}-${charIdx}`}
                className={clsx("inline-block", charClassName)}
              >
                {char}
              </span>
            ))}
            {wordIdx < words.length - 1 && (
              <span className="inline-block">&nbsp;</span>
            )}
          </span>
        ))}
      </span>
    );
  }

  // Default to words
  return (
    <span className={clsx("inline-block", className)} aria-label={children}>
      {words.map((word, wordIdx) => (
        <span
          key={`w-${wordIdx}`}
          className={clsx("inline-block overflow-hidden", wordClassName)}
          aria-hidden="true"
        >
          <span className="inline-block split-word">
            {word}
            {wordIdx < words.length - 1 && "\u00A0"}
          </span>
        </span>
      ))}
    </span>
  );
}
