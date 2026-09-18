import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/libs/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly asChild?: boolean;
  readonly variant?: "primary" | "secondary" | "destructive" | "ghost";
  readonly size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", asChild = false, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-[4px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-filament disabled:pointer-events-none disabled:opacity-40 cursor-pointer active:scale-[0.98]";

    const sizeStyles = {
      sm: "h-8 px-3 text-xs tracking-wider",
      md: "h-10 px-5 text-sm tracking-wider",
      lg: "h-12 px-7 text-base tracking-widest",
    }[size];

    const variantStyles = {
      primary:
        "bg-filament text-void font-syne font-semibold uppercase hover:glow-button hover:bg-incandescent",
      secondary:
        "bg-surface-1 border border-surface-border text-filament-aged hover:border-monad/60 hover:bg-surface-2 hover:text-incandescent",
      destructive:
        "bg-transparent border border-crimson/40 text-crimson hover:bg-crimson/15",
      ghost:
        "bg-transparent text-filament-aged hover:bg-surface-2 hover:text-incandescent",
    }[variant];

    return (
      <Comp
        className={cn(baseStyles, sizeStyles, variantStyles, className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
