"use client";

import { usePathname } from "next/navigation";
import { useLenisScroll } from "@/hooks/use-lenis-scroll";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function SmoothPageScroll() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  // The landing owns its instance so welcome/reading mode can suspend it.
  useLenisScroll(reduced || pathname === "/");
  return null;
}
