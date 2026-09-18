"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { LATTERN_SCENES } from "@/constants/lattern-scenes";
import { cinematicState, updateCinematicState } from "@/libs/cinematic/runtime";
import { clamp, mapProgress, smoothstep } from "@/libs/cinematic/progress";

gsap.registerPlugin(ScrollTrigger);

export function useCinematicScroll(
  root: RefObject<HTMLElement | null>,
  staticMode: boolean,
  onChapter: (chapter: number) => void
) {
  const lenisRef = useRef<Lenis | null>(null);
  const focusProgress = useRef<number | null>(null);
  const jump = (progress: number, focusProduct = false) => {
    if (!root.current) return;
    focusProgress.current = focusProduct ? progress : null;
    if (staticMode) {
      const scene =
        LATTERN_SCENES.findLast((s) => s.start <= progress) ??
        LATTERN_SCENES[0];
      document
        .getElementById(scene.id)
        ?.scrollIntoView({ behavior: "instant", block: "start" });
      if (focusProduct)
        document
          .querySelector<HTMLTextAreaElement>("#product textarea")
          ?.focus({ preventScroll: true });
      return;
    }
    const top =
      root.current.offsetTop +
      progress * (root.current.offsetHeight - window.innerHeight);
    if (lenisRef.current) lenisRef.current.scrollTo(top, { duration: 1.3 });
    else window.scrollTo({ top, behavior: "instant" });
  };

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    cinematicState.reducedMotion = staticMode;
    cinematicState.mobile = window.innerWidth < 768;
    if (staticMode) {
      updateCinematicState(0.12);
      element.querySelectorAll<HTMLElement>("[data-scene]").forEach((scene) => {
        scene.removeAttribute("style");
        scene.inert = false;
        scene.removeAttribute("aria-hidden");
      });
      return;
    }
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, anchors: true });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    const panels = Array.from(
      element.querySelectorAll<HTMLElement>("[data-scene]")
    );
    const lightText = Array.from(
      element.querySelectorAll<HTMLElement>("[data-light-text]")
    );
    const playhead = { progress: 0 };
    let lastChapter = -1;
    const measure = () => {
      cinematicState.mobile = window.innerWidth < 768;
      lightText.forEach((text) => {
        const rect = text.getBoundingClientRect();
        text.style.setProperty("--text-left", `${rect.left}px`);
        text.style.setProperty("--text-top", `${rect.top}px`);
      });
      updateCinematicState(playhead.progress);
    };
    const render = () => {
      const p = clamp(playhead.progress);
      updateCinematicState(p);
      element.style.setProperty("--journey", String(p));
      element.style.setProperty("--warmth", String(cinematicState.ignition));
      let active = LATTERN_SCENES.findIndex((s) => p < s.end);
      if (active < 0) active = LATTERN_SCENES.length - 1;
      panels.forEach((panel, i) => {
        const scene = LATTERN_SCENES[i];
        const local = mapProgress(scene.start, scene.end, p);
        let alpha =
          smoothstep(mapProgress(0, 0.12, local)) *
          (1 - smoothstep(mapProgress(0.88, 1, local)));
        if (i === 0) alpha = 1 - smoothstep(mapProgress(0.88, 1, local));
        if (i === 10) alpha = smoothstep(mapProgress(0, 0.2, local));
        const visible = active === i;
        if (!visible && panel.contains(document.activeElement)) {
          element
            .querySelector<HTMLButtonElement>(".lattern-launch")
            ?.focus({ preventScroll: true });
        }
        panel.style.opacity = visible ? String(alpha) : "0";
        panel.style.visibility = visible ? "visible" : "hidden";
        panel.style.transform = `translateY(${(1 - smoothstep(mapProgress(0, 0.22, local))) * 18}px)`;
        panel.inert = !visible;
        panel.setAttribute("aria-hidden", String(!visible));
        panel.style.setProperty(
          "--reveal",
          `${smoothstep(mapProgress(0.04, 0.45, local)) * 110}%`
        );
      });
      // Resolve current nodes: Fast Refresh can replace the chapter content
      // without recreating the scroll timeline.
      element
        .querySelectorAll<HTMLElement>("[data-sequence]")
        .forEach((line) => {
          const start = Number(line.dataset.sequence);
          line.style.opacity = String(
            smoothstep(mapProgress(start, start + 0.009, p))
          );
          line.style.transform = `translateY(${(1 - smoothstep(mapProgress(start, start + 0.009, p))) * 12}px)`;
        });
      if (active !== lastChapter) {
        lastChapter = active;
        onChapter(active);
      }
      if (
        focusProgress.current !== null &&
        Math.abs(p - focusProgress.current) < 0.003
      ) {
        element
          .querySelector<HTMLTextAreaElement>("#product textarea")
          ?.focus({ preventScroll: true });
        focusProgress.current = null;
      }
    };
    const context = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: element,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.65,
            invalidateOnRefresh: true,
            onRefresh: measure,
          },
        })
        .to(playhead, {
          progress: 1,
          duration: 1,
          ease: "none",
          onUpdate: render,
        });
    }, element);
    // Camera projection is refreshed by R3F. Update only CSS variables, never React state.
    const syncLight = () => {
      element.style.setProperty(
        "--light-x",
        `${(cinematicState.lightScreenX / 100) * window.innerWidth}px`
      );
      element.style.setProperty(
        "--light-y",
        `${(cinematicState.lightScreenY / 100) * window.innerHeight}px`
      );
    };
    gsap.ticker.add(syncLight);
    const modalChange = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail) lenis.stop();
      else lenis.start();
    };
    window.addEventListener("lattern:dialog", modalChange);
    measure();
    render();
    window.addEventListener("resize", measure);
    return () => {
      context.revert();
      lenis.destroy();
      lenisRef.current = null;
      gsap.ticker.remove(raf);
      gsap.ticker.remove(syncLight);
      window.removeEventListener("resize", measure);
      window.removeEventListener("lattern:dialog", modalChange);
    };
  }, [root, staticMode, onChapter]);
  return jump;
}
