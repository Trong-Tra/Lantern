import * as React from "react";
import { cn } from "@/libs/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  readonly variant?: "verified" | "amber" | "protocol" | "default";
  readonly pulse?: boolean;
}

export function Badge({
  className,
  variant = "default",
  pulse = false,
  children,
  ...props
}: Readonly<BadgeProps>) {
  const baseStyles =
    "inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[2px] font-mono text-[10px] tracking-wide uppercase border";

  const variantStyles = {
    verified: "bg-emerald/10 border-emerald/30 text-emerald",
    amber: "bg-amber/10 border-amber/30 text-amber",
    protocol: "bg-monad/10 border-monad/30 text-monad",
    default: "bg-surface-2 border-surface-border text-filament-aged",
  }[variant];

  const dotColor = {
    verified: "bg-emerald",
    amber: "bg-amber",
    protocol: "bg-monad",
    default: "bg-filament-aged",
  }[variant];

  return (
    <span className={cn(baseStyles, variantStyles, className)} {...props}>
      {pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              dotColor
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              dotColor
            )}
          />
        </span>
      ) : null}
      {children}
    </span>
  );
}
