"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { lanternSceneState } from "@/components/experience/scene-state";
import { LightReveal } from "@/components/typography";

export function LightChapter() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const initialPromptRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const primaryTitleRef = useRef<HTMLHeadingElement>(null);
  const secondaryCopyRef = useRef<HTMLParagraphElement>(null);
  const chapterBadgeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current || !pinRef.current) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          pin: pinRef.current,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // 0. Initial State setup
      gsap.set(primaryTitleRef.current, {
        opacity: 0,
        y: 40,
        scale: 0.94,
        filter: "blur(12px)",
      });
      gsap.set(secondaryCopyRef.current, {
        opacity: 0,
        y: 25,
      });
      gsap.set(chapterBadgeRef.current, {
        opacity: 0,
        x: -20,
      });

      // -------------------------------------------------------------
      // 0.00 – 0.15: Emergence
      // Lantern slowly enters visibility: rot 0° -> 30°, light 0.05 -> 0.15, scale 0.95 -> 1.0
      // -------------------------------------------------------------
      tl.addLabel("emergence", 0);
      tl.to(
        lanternSceneState,
        {
          rotationY: (30 * Math.PI) / 180,
          lightIntensity: 0.15,
          emissiveIntensity: 0.35,
          scale: 1,
          ease: "none",
        },
        0
      );

      // Fade out initial "SCROLL TO DISCOVER" indicator early
      tl.to(
        initialPromptRef.current,
        {
          opacity: 0,
          y: -24,
          ease: "power1.out",
        },
        0.02
      );

      // Fade in subtle chapter badge
      tl.to(
        chapterBadgeRef.current,
        {
          opacity: 0.7,
          x: 0,
          ease: "power1.out",
        },
        0.08
      );

      // -------------------------------------------------------------
      // 0.15 – 0.35: Rotation & Ember Ignition
      // Lantern rotates: 30° -> 140°, light 0.15 -> 0.8, particles awaken
      // -------------------------------------------------------------
      tl.addLabel("rotate_embers", 0.15);
      tl.to(
        lanternSceneState,
        {
          rotationY: (140 * Math.PI) / 180,
          lightIntensity: 0.8,
          emissiveIntensity: 0.7,
          glowIntensity: 0.6,
          particleEnergy: 0.8,
          ease: "none",
        },
        0.15
      );

      // -------------------------------------------------------------
      // 0.35 – 0.50: Light Intensification
      // Lantern generates strong light: 140° -> 220°, light 0.8 -> 3.0
      // -------------------------------------------------------------
      tl.addLabel("illuminate", 0.35);
      tl.to(
        lanternSceneState,
        {
          rotationY: (220 * Math.PI) / 180,
          lightIntensity: 3.0,
          emissiveIntensity: 1.0,
          glowIntensity: 1.0,
          particleEnergy: 1.0,
          ease: "none",
        },
        0.35
      );

      // -------------------------------------------------------------
      // 0.50 – 0.70: Typography Reveal
      // Light reveals "ONE LIGHT" and secondary copy
      // -------------------------------------------------------------
      tl.addLabel("reveal", 0.5);
      tl.to(
        primaryTitleRef.current,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          ease: "power2.out",
        },
        0.5
      );

      tl.to(
        secondaryCopyRef.current,
        {
          opacity: 0.9,
          y: 0,
          ease: "power2.out",
        },
        0.58
      );

      // -------------------------------------------------------------
      // 0.70 – 0.90: Lantern Elevation & Peak Illumination
      // Lantern moves slightly upward, text clarity peaks
      // -------------------------------------------------------------
      tl.addLabel("clarity", 0.7);
      tl.to(
        lanternSceneState,
        {
          positionY: 0.35,
          rotationY: (240 * Math.PI) / 180,
          ease: "none",
        },
        0.7
      );

      // -------------------------------------------------------------
      // 0.90 – 1.00: Prepare Seamless Transition to Chapter 02
      // Continuous camera & lantern rotation, text exits gently
      // -------------------------------------------------------------
      tl.addLabel("transition", 0.9);
      tl.to(
        lanternSceneState,
        {
          rotationY: (270 * Math.PI) / 180,
          cameraZ: 5.8,
          ease: "none",
        },
        0.9
      );

      tl.to(
        [primaryTitleRef.current, secondaryCopyRef.current],
        {
          opacity: 0,
          y: -30,
          filter: "blur(8px)",
          ease: "power1.in",
        },
        0.92
      );

      tl.to(
        chapterBadgeRef.current,
        {
          opacity: 0,
          ease: "power1.in",
        },
        0.94
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[450vh] w-full"
      aria-label="Chapter 01: The Light"
    >
      {/* Pinned Screen Viewport */}
      <div
        ref={pinRef}
        className="sticky top-0 flex h-screen w-full flex-col justify-between overflow-hidden px-6 py-10 sm:px-12 sm:py-14"
      >
        {/* Chapter Header Cue */}
        <header className="flex w-full items-center justify-between text-xs tracking-widest text-filament-aged/60 uppercase">
          <div ref={chapterBadgeRef} className="flex items-center gap-3">
            <span className="font-mono text-monad">01 / 05</span>
            <span className="h-1 w-1 rounded-full bg-filament/40" />
            <span className="font-sans font-medium tracking-widest">
              The Light
            </span>
          </div>
          <div className="font-mono text-[10px] tracking-wider text-filament/30">
            CHIAROSCURO PROTOCOL
          </div>
        </header>

        {/* Central Illuminated Narrative Content */}
        <div
          ref={messageContainerRef}
          className="pointer-events-none mx-auto flex max-w-3xl flex-col items-center justify-center text-center select-none"
        >
          <LightReveal>
            <h1
              ref={primaryTitleRef}
              className="font-syne text-5xl font-extrabold tracking-tight text-incandescent sm:text-7xl md:text-8xl"
              style={{
                textShadow:
                  "0 0 60px rgba(252, 231, 200, 0.4), 0 0 120px rgba(131, 110, 249, 0.15)",
              }}
            >
              ONE LIGHT
            </h1>
          </LightReveal>

          <p
            ref={secondaryCopyRef}
            className="mt-6 max-w-lg font-mono text-sm tracking-widest text-filament-aged/80 sm:text-base"
          >
            Every signal begins somewhere.
          </p>
        </div>

        {/* Bottom Initial Indicator: "SCROLL TO DISCOVER" */}
        <footer
          ref={initialPromptRef}
          className="pointer-events-none flex flex-col items-center justify-center gap-2 text-center text-filament/60 select-none"
        >
          <span className="font-mono text-xs tracking-[0.25em] uppercase">
            Scroll to Discover
          </span>
          <div className="flex h-5 w-3 items-center justify-center rounded-full border border-filament/30">
            <div className="h-1.5 w-0.5 animate-bounce rounded-full bg-filament/70" />
          </div>
        </footer>
      </div>
    </section>
  );
}
