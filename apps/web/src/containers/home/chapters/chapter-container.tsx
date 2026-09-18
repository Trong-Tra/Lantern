"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { lanternSceneState } from "@/components/experience/scene-state";

const chapters = [
  { number: "01", label: "THE LIGHT", title: "ONE LIGHT", copy: "Every signal begins somewhere." },
  { number: "02", label: "DISCOVER", title: "DISCOVER", copy: "Find what matters." },
  { number: "03", label: "CONNECT", title: "CONNECT", copy: "Bring people, agents and information together." },
  { number: "04", label: "INTELLIGENCE", title: "INTELLIGENCE", copy: "Intelligence becomes more powerful when it can coordinate." },
  { number: "05", label: "THE NETWORK", title: "THE NETWORK", copy: "One light is a signal. Together, they become a network." },
] as const;

export function ChapterContainer() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const promptRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!sectionRef.current || !pinRef.current) return;
    Object.assign(lanternSceneState, { rotationY: 0, positionX: 0, positionY: 0, positionZ: 0, scale: .95, lanternOpacity: .35, lightIntensity: .05, glowIntensity: .05, emissiveIntensity: .15, particleEnergy: 0, networkProgress: 0, networkEnergy: 0, cameraX: 0, cameraY: .2, cameraZ: 6.2, cameraFov: 45 });
    chapterRefs.current.forEach((node, index) => gsap.set(node, { autoAlpha: index === 0 ? 1 : 0, y: index === 0 ? 0 : 24, filter: index === 0 ? "blur(0px)" : "blur(10px)" }));
    gsap.set(finalRef.current, { autoAlpha: 0, y: 20 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom bottom", pin: pinRef.current, scrub: 1, anticipatePin: 1 } });
    const reveal = (index: number, at: number) => {
      tl.to(chapterRefs.current[index], { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: .08, ease: "power2.out" }, at)
        .to(chapterRefs.current[index], { autoAlpha: 0, y: -26, filter: "blur(9px)", duration: .06, ease: "power1.in" }, at + .14);
    };
    tl.to(promptRef.current, { autoAlpha: 0, y: -16, duration: .05 }, .05)
      .addLabel("awaken", 0)
      .to(lanternSceneState, { rotationY: Math.PI * .8, scale: 1, lanternOpacity: 1, lightIntensity: 2.6, glowIntensity: 1, emissiveIntensity: .9, particleEnergy: .8, duration: .22, ease: "none" }, 0);
    reveal(0, .14);
    tl.addLabel("discover", .22).to(lanternSceneState, { positionX: -1.55, rotationY: Math.PI * 1.35, lightIntensity: 3.2, glowIntensity: 1.4, cameraX: -.15, duration: .14, ease: "power1.inOut" }, .22);
    reveal(1, .29);
    tl.addLabel("connect", .41).to(lanternSceneState, { positionX: 0, positionY: .2, rotationY: Math.PI * 2.05, scale: .9, networkProgress: .56, networkEnergy: .35, cameraZ: 7.2, cameraFov: 48, duration: .15, ease: "power2.out" }, .41);
    reveal(2, .49);
    tl.addLabel("coordinate", .61).to(lanternSceneState, { rotationY: Math.PI * 2.8, positionY: -.15, networkProgress: .82, networkEnergy: 1, particleEnergy: 1.3, lightIntensity: 3.8, cameraZ: 8.8, cameraFov: 52, duration: .15, ease: "power1.inOut" }, .61);
    reveal(3, .68);
    tl.addLabel("network", .8).to(lanternSceneState, { lanternOpacity: .15, scale: .55, positionY: 0, networkProgress: 1, networkEnergy: 1.4, cameraZ: 12.2, cameraY: .45, cameraFov: 56, duration: .16, ease: "power2.out" }, .8);
    reveal(4, .84);
    tl.to(finalRef.current, { autoAlpha: 1, y: 0, duration: .1, ease: "power2.out" }, .94)
      .to(progressRef.current, { textContent: "100", duration: 1, snap: { textContent: 1 } }, 0);
  }, { scope: sectionRef });

  return <section ref={sectionRef} className="relative h-[1100vh]" aria-label="Lantern cinematic journey">
    <div ref={pinRef} className="sticky top-0 h-screen overflow-hidden px-6 py-7 sm:px-12 sm:py-10">
      <header className="relative z-10 flex items-center justify-between font-mono text-[10px] tracking-[.24em] text-filament-aged/65 uppercase"><span className="flex items-center gap-3"><i className="h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_12px_#f59e0b]" /> Lantern</span><span><span ref={progressRef}>00</span> / 100</span></header>
      <div className="relative z-10 mx-auto flex h-[calc(100%-4rem)] max-w-6xl items-center justify-center">
        {chapters.map((chapter, index) => <div key={chapter.number} ref={(node) => { chapterRefs.current[index] = node; }} className="pointer-events-none absolute max-w-3xl text-center"><p className="mb-5 font-mono text-[10px] tracking-[.36em] text-amber/80 uppercase">{chapter.number} — {chapter.label}</p><h1 className="light-title font-syne text-5xl font-bold tracking-[-.06em] text-incandescent sm:text-7xl md:text-8xl">{chapter.title}</h1><p className="mx-auto mt-6 max-w-xl font-mono text-sm leading-7 tracking-wide text-filament-aged/80 sm:text-base">{chapter.copy}</p></div>)}
        <div ref={finalRef} className="pointer-events-auto absolute bottom-[8%] text-center"><p className="font-mono text-[10px] tracking-[.3em] text-filament/70 uppercase">Build with the network</p><button type="button" className="mt-5 border border-filament/45 bg-filament/10 px-7 py-3 font-mono text-xs tracking-[.18em] text-incandescent uppercase transition hover:bg-filament/20" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Get Started</button></div>
      </div>
      <footer ref={promptRef} className="absolute inset-x-0 bottom-8 z-10 text-center font-mono text-[10px] tracking-[.3em] text-filament/60 uppercase">Scroll to discover</footer>
    </div>
  </section>;
}
