"use client";

import { useLenisScroll, useReducedMotion } from "@/hooks";
import { ExperienceCanvas } from "@/components/experience";
import { ChapterContainer } from "./chapters";

export function HomeContainer() {
  const prefersReducedMotion = useReducedMotion();
  useLenisScroll(prefersReducedMotion);

  return (
    <div className="relative min-h-screen w-full bg-void selection:bg-monad/30 selection:text-incandescent">
      {/* 1. Persistent Full-Viewport 3D Canvas */}
      <ExperienceCanvas />

      {/* 2. Scroll-Driven Cinematic Chapters */}
      <main className="relative z-10 w-full">
        <ChapterContainer />
      </main>
    </div>
  );
}
