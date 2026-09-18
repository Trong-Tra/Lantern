"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { LATTERN_SCENES } from "@/constants/lattern-scenes";
import { LightRevealText } from "@/components/animations/light-reveal-text";
import { LatternMark } from "@/components/icons/lattern-mark";
import { ProductPreview } from "@/components/organisms/lattern-preview";
import { SceneDetails } from "./components/scene-details";
import { useCinematicScroll } from "./hooks/use-cinematic-scroll";
import "./noscript.scss";

const LatternWorld = dynamic(
  () => import("@/components/organisms/lattern-world"),
  { ssr: false }
);
const subscribeMotion = (callback: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
};
const getMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerMotion = () => false;

export function LatternExperience() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [reader, setReader] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getMotion,
    getServerMotion
  );
  const staticMode = reducedMotion || reader || unavailable;
  let viewLabel = staticMode ? "Reading mode" : "Read the story";
  if (reducedMotion) viewLabel = "Reduced motion · reading mode";
  if (unavailable) viewLabel = "3D unavailable · reading mode";
  const jump = useCinematicScroll(root, staticMode, setActive);
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => {
    setUnavailable(true);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready || staticMode) return;
    // Loading never prevents reading the story if a renderer cannot initialize.
    const timeout = window.setTimeout(onUnavailable, 12000);
    return () => window.clearTimeout(timeout);
  }, [ready, staticMode, onUnavailable]);

  return (
    <main
      ref={root}
      id="lattern"
      className={`lattern-experience ${staticMode ? "lattern-static" : ""}`}
    >
      <a
        className="lattern-skip"
        href="#product"
        onClick={(event) => {
          event.preventDefault();
          jump(0.929, true);
        }}
      >
        Skip to product preview
      </a>
      {!staticMode && (
        <div className="lattern-world" aria-hidden="true">
          <LatternWorld
            onReady={onReady}
            onUnavailable={onUnavailable}
            reducedMotion={reducedMotion}
          />
        </div>
      )}
      <div className="lattern-vignette" aria-hidden="true" />
      <div className="lattern-grain" aria-hidden="true" />

      {!ready && !staticMode && (
        <div className="lattern-loading" role="status">
          <LatternMark />
          <span>Gathering a little light.</span>
          <button type="button" onClick={() => setReader(true)}>
            Read the story
          </button>
        </div>
      )}

      <header className="lattern-header">
        <button
          className="lattern-wordmark"
          onClick={() => jump(0)}
          aria-label="Lattern, return to the beginning"
        >
          <LatternMark />
          <span>LATTERN</span>
        </button>
        <nav className="lattern-top-nav" aria-label="Main navigation">
          <button onClick={() => jump(0.315)}>The trust layer</button>
          <button onClick={() => jump(0.657)}>How it works</button>
        </nav>
        <button className="lattern-launch" onClick={() => jump(0.929, true)}>
          Launch Lattern <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="lattern-stage">
        {LATTERN_SCENES.map((scene, i) => (
          <section
            key={scene.id}
            id={scene.id}
            data-scene={scene.id}
            aria-labelledby={`${scene.id}-label`}
            className={`lattern-scene scene-${scene.id}`}
            style={
              i > 0 && !staticMode
                ? { visibility: "hidden", opacity: 0 }
                : undefined
            }
          >
            <div className="scene-editorial">
              <p id={`${scene.id}-label`} className="scene-kicker">
                <span className="kicker-line" />
                {scene.kicker}
              </p>
              <LightRevealText
                text={scene.title}
                as={i === 0 ? "h1" : "h2"}
                className="scene-title"
              />
              <p
                className="scene-copy"
                data-sequence={scene.start + (scene.end - scene.start) * 0.24}
              >
                {scene.copy}
              </p>
              <p
                className="scene-aside"
                data-sequence={scene.start + (scene.end - scene.start) * 0.47}
              >
                {scene.aside}
              </p>
              <SceneDetails id={scene.id} />
              {scene.id === "ignition" && (
                <span className="ignition-signature" aria-hidden="true">
                  LATTERN
                </span>
              )}
              {scene.id === "darkness" && (
                <button className="begin-journey" onClick={() => jump(0.118)}>
                  <span className="scroll-stroke" />
                  Scroll to find your light <span>↓</span>
                </button>
              )}
              {scene.id === "finale" && (
                <div className="final-actions">
                  <button
                    className="primary-action"
                    onClick={() => jump(0.929, true)}
                  >
                    Launch Lattern <span>↗</span>
                  </button>
                  <span className="unpublished">
                    View Contracts <small>Not published yet</small>
                  </span>
                  <span className="unpublished">
                    GitHub <small>Not published yet</small>
                  </span>
                </div>
              )}
            </div>
            {scene.id === "product" && (
              <div className="product-surface" data-lenis-prevent>
                <ProductPreview compact={!staticMode} />
              </div>
            )}
            {scene.id === "darkness" && (
              <div className="opening-coordinate" aria-hidden="true">
                <span>SIGNAL_001</span>
                <i />
                <span>THE UNKNOWN</span>
              </div>
            )}
          </section>
        ))}
      </div>

      <footer className="lattern-controls">
        <div className="chapter-current">
          <span>{String(active + 1).padStart(2, "0")}</span>
          <span className="chapter-divider">/</span>
          <span>{LATTERN_SCENES[active].name}</span>
        </div>
        <nav className="chapter-dots" aria-label="Story chapters">
          {LATTERN_SCENES.map((scene, i) => (
            <button
              key={scene.id}
              aria-label={`Chapter ${i + 1}: ${scene.name}`}
              aria-current={active === i ? "step" : undefined}
              onClick={() =>
                jump(scene.start + (scene.end - scene.start) * 0.5)
              }
            >
              <span />
            </button>
          ))}
        </nav>
        <button
          className="motion-toggle"
          onClick={() => {
            setReader(!reader);
            window.scrollTo(0, 0);
          }}
          disabled={reducedMotion || unavailable}
        >
          {viewLabel}
          <span aria-hidden="true">{staticMode ? "◷" : "≡"}</span>
        </button>
        <div className="journey-track" aria-hidden="true">
          <span />
        </div>
      </footer>
    </main>
  );
}
