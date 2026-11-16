"use client";

import React from "react";
import { cn } from "@/libs/utils";

type MenuToggleProps = React.ComponentProps<"button"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strokeWidth?: number;
};

// A native button lets Radix preserve keyboard, focus and dismissal behavior.
export function MenuToggle({ open, onOpenChange, className, strokeWidth = 2, onClick, ...props }: MenuToggleProps) {
  return (
    <button type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} className={cn("menu-toggle", className)} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented && props["aria-haspopup"] !== "menu") onOpenChange(!open); }} {...props}>
      <svg aria-hidden="true" strokeWidth={strokeWidth} fill="none" stroke="currentColor" viewBox="0 0 32 32" strokeLinecap="round" strokeLinejoin="round" className={cn("menu-toggle-icon", open && "menu-toggle-icon-open")}>
        <path className="menu-toggle-path" style={{ strokeDasharray: open ? "20 300" : "12 63", strokeDashoffset: open ? -32.42 : 0 }} d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22" />
        <path d="M7 16 27 16" />
      </svg>
    </button>
  );
}

