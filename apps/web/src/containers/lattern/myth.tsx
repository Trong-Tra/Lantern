"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useLenisScroll } from "@/hooks/use-lenis-scroll";
import {
  journeyState,
  sampleJourney,
  contentBeat,
  ease,
  scrollToScore,
} from "@/libs/cinematic/chapter-transition";
import { ProductPreview } from "@/components/organisms/lattern-preview";
import { LATTERN_SCENES } from "@/constants/lattern-scenes";
import "./myth.css";
import { ReferenceDetails } from "./reference-details";
import { LanternWelcome } from "./lantern-welcome";
const JourneyWorld = dynamic(
  () => import("@/components/organisms/lantern-journey"),
  { ssr: false }
);
const anchors = LATTERN_SCENES.map((scene) => scene.id);
const WORLD_CHAPTERS = [0, 0, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];
const STORY_END = LATTERN_SCENES.length - 0.2;
const subscribeHydration = () => () => {};

function RollingText({ text }: { text: string }) {
  let letter = 0;
  return (
    <span className="rolling-text" aria-label={text}>
      {text.split(/(\s+)/).map((word, index) =>
        /\s/.test(word) ? (
          word
        ) : (
          <span className="rolling-word" aria-hidden="true" key={index}>
            {Array.from(word).map((char) => {
              const order = letter++;
              return (
                <span
                  className="rolling-letter"
                  data-letter={order}
                  style={
                    {
                      "--letter-delay": Math.min(order * 0.002, 0.08),
                    } as CSSProperties
                  }
                  key={order}
                >
                  {char}
                </span>
              );
            })}
          </span>
        )
      )}
    </span>
  );
}

const SECTION_SLOTS = Math.max(
  ...LATTERN_SCENES.map((scene) => Array.from(scene.name).length)
);
function SectionName({ text }: { text: string }) {
  const [labels, setLabels] = useState({ current: text, previous: text });
  if (labels.current !== text)
    setLabels({ current: text, previous: labels.current });
  const current = Array.from(labels.current.padStart(SECTION_SLOTS, " "));
  const previous = Array.from(labels.previous.padStart(SECTION_SLOTS, " "));
  return (
    <span
      className="section-name"
      aria-hidden="true"
      style={{ gridTemplateColumns: `repeat(${SECTION_SLOTS}, 1fr)` }}
    >
      {Array.from({ length: SECTION_SLOTS }, (_, index) => (
        <span className="section-slot" key={index}>
          <span
            className="section-spin"
            key={labels.current}
            style={{ animationDelay: `${index * 16}ms` }}
          >
            <span className="section-face section-face-old">
              {previous[index] || "\u00a0"}
            </span>
            <span className="section-face section-face-new">
              {current[index] || "\u00a0"}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

export function MythLanding() {
  const journey = useRef<HTMLElement>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const progressBar = useRef<HTMLSpanElement>(null);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false
  );
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    if (hydrated) document.documentElement.classList.remove("no-js");
  }, [hydrated]);
  const completeIntro = useCallback(() => {
    journeyState.entranceAt = 0;
    journeyState.ignitionAt = 0;
    setIntroDone(true);
  }, []);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [worldStarted, setWorldStarted] = useState(false);
  const onWorldStart = useCallback(() => setWorldStarted(true), []);
  const [reading, setReading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const reduced = useReducedMotion();
  const staticMode = reading || reduced || unavailable;
  const smoothScroll = useLenisScroll(staticMode || !introDone);
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setUnavailable(true), []);
  useEffect(() => {
    if (ready || staticMode) return;
    const timer = setTimeout(onError, worldStarted ? 12000 : 30000);
    return () => clearTimeout(timer);
  }, [ready, staticMode, onError, worldStarted]);
  useEffect(() => {
    if (!journey.current || !introDone) return;
    let start = 0,
      travel = 1,
      frame = 0,
      current = -1;
    const measure = () => {
      if (journey.current) {
        start = journey.current.offsetTop;
        travel = Math.max(1, journey.current.offsetHeight - innerHeight);
      }
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(journey.current);
    // Cache content layers once; animation never searches the document per frame.
    const layers = panels.current.map((panel) =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              ".chapter-detail, .trust-crossing, .hero-actions, .soul-layers > span, .agent-receipt > div, .chapter-sequence > li, .route-checks > *, .foundation-stack > li, .chapter-paper-links > a, .story-copy > .text-link"
            )
          )
        : []
    );
    const passportPages = Array.from(
      stage.current?.querySelectorAll<HTMLElement>(".passport-pages > div") ??
        []
    );
    const previousWeights = new Array(panels.current.length).fill(-1);
    let previousContentPosition = NaN;
    let previousContentScroll = NaN;
    const previousPresence = new WeakMap<HTMLElement, number>();
    const pointer = (event: PointerEvent) => {
      journeyState.pointerX = event.clientX / innerWidth - 0.5;
      journeyState.pointerY = event.clientY / innerHeight - 0.5;
    };
    const tick = () => {
      const destination =
        (scrollToScore(scrollY, start, travel) / 4.8) * STORY_END;
      // Scroll owns the pose: stopping never leaves timed chapters queued behind it.
      const score = sampleJourney(destination, {
        count: LATTERN_SCENES.length,
        hold: 0,
      });
      const worldWeights = [0, 0, 0, 0, 0];
      score.weights.forEach((weight, index) => {
        worldWeights[WORLD_CHAPTERS[index]] += weight;
      });
      const world = {
        ...score,
        from: WORLD_CHAPTERS[score.from],
        to: WORLD_CHAPTERS[score.to],
        active: WORLD_CHAPTERS[score.active],
        weights: worldWeights,
      };
      Object.assign(journeyState, world, {
        chapters: score.weights,
        portal: staticMode ? 0 : score.mix,
        transition: score.from,
        reducedMotion: staticMode,
        tail: Math.max(
          0,
          Math.min(1, (scrollY - start - travel) / innerHeight)
        ),
      });
      // The scene keeps animating at rest; DOM choreography only changes with the score.
      if (
        score.position !== previousContentPosition ||
        (staticMode && scrollY !== previousContentScroll)
      ) {
        previousContentPosition = score.position;
        previousContentScroll = scrollY;
        journey.current
          ?.closest<HTMLElement>(".myth")
          ?.style.setProperty("--identity-weight", String(world.weights[2]));
        panels.current.forEach((panel, index) => {
          if (!panel) return;
          const weight = score.weights[index];
          if (!staticMode && weight === 0 && previousWeights[index] === 0)
            return;
          previousWeights[index] = weight;
          panel.style.setProperty("--letter-mix", String(score.mix));
          panel.style.opacity = staticMode
            ? "1"
            : weight <= 0
              ? "0"
              : String(
                  index === score.from
                    ? 1 - ease((score.mix - 0.26) / 0.2)
                    : ease((score.mix - 0.52) / 0.25)
                );
          panel.style.transform = "none";
          const incoming = index === score.to && score.to !== score.from;
          panel.dataset.incoming = String(incoming);
          const direction = [3, 4, 5].includes(index) ? -1 : 1;
          layers[index].forEach((element, layer) => {
            const beat = contentBeat(score.mix, incoming, layer + 8);
            const presence = staticMode ? 1 : beat.presence;
            const travel = staticMode ? 0 : beat.travel;
            if (previousPresence.get(element) === presence) return;
            previousPresence.set(element, presence);
            const isRow = element.matches(
              "li, .agent-receipt > div, .route-checks > *, .soul-layers > span"
            );
            element.style.opacity = String(presence);
            element.style.transform = isRow
              ? `translate3d(${travel * direction * 16}px,0,${-Math.abs(travel) * 70}px) scaleX(${0.88 + presence * 0.12})`
              : `translate3d(${travel * direction * 22}px,${travel * 8}px,${-Math.abs(travel) * 120}px)`;
            element.style.filter = `blur(${(1 - presence) * 1}px)`;
            element.style.clipPath = isRow
              ? `inset(0 ${(1 - presence) * 100}% 0 0)`
              : "none";
          });
          panel.inert = !staticMode && weight < 0.5;
          panel.setAttribute(
            "aria-hidden",
            String(!staticMode && weight < 0.5)
          );
        });
        if (progressBar.current)
          progressBar.current.style.transform = `scaleX(${score.position / STORY_END})`;
        if (stage.current) {
          stage.current.dataset.step = String(
            Math.min(
              2,
              Math.floor((score.from === score.active ? score.local : 0) * 5.8)
            )
          );
          stage.current.dataset.hop = String(
            Math.min(
              3,
              Math.floor((score.from === score.active ? score.local : 0) * 7.5)
            )
          );
        }
        passportPages.forEach((page, index) => {
          page.setAttribute(
            "aria-hidden",
            String(!staticMode && index !== Number(stage.current?.dataset.step))
          );
        });
        let visibleChapter = score.active;
        if (staticMode) {
          visibleChapter = 0;
          panels.current.forEach((panel, index) => {
            if (
              panel &&
              panel.getBoundingClientRect().top <= innerHeight * 0.45
            )
              visibleChapter = index;
          });
        }
        if (current !== visibleChapter) {
          current = visibleChapter;
          setActive(current);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", pointer, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", pointer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [staticMode, introDone]);
  const jump = (index: number) => {
    if (staticMode) {
      panels.current[index]?.scrollIntoView({ behavior: "auto" });
      return;
    }
    if (journey.current) {
      window.dispatchEvent(new Event("lattern:warp"));
      const top =
        journey.current.offsetTop +
        (journey.current.offsetHeight - innerHeight) *
          ((index + 0.1) / STORY_END);
      if (smoothScroll.current) smoothScroll.current.scrollTo(top);
      else window.scrollTo({ top, behavior: reduced ? "instant" : "smooth" });
    }
  };
  return (
    <>
      {hydrated && !introDone && (
        <LanternWelcome
          disabled={staticMode}
          ready={ready}
          onComplete={completeIntro}
        />
      )}
      <main
        className={`myth ${staticMode ? "myth-reading" : ""} ${hydrated && !introDone && !staticMode ? "myth-igniting" : ""}`}
        data-chapter={active}
      >
        <noscript>
          <style>{`
          .lantern-welcome { display: none !important; }
          main[inert] { interactivity: auto; }
          .journey { height: auto !important; }
          .journey-stage { height: auto; position: relative; overflow: visible; }
          .story-panel { position: relative; opacity: 1 !important; transform: none !important; min-height: 560px; pointer-events: auto; }
          .story-copy { width: 100%; }
          .passport-pages { height: auto; }
          .passport-pages > div { position: relative; opacity: 1; visibility: visible; transform: none; margin: 24px 0; }
          .story-progress, .reading-toggle, .stage-note, .menu-toggle { display: none; }
          .myth-header nav { display: flex; }
        `}</style>
        </noscript>
        <a className="myth-skip" href="#demo">
          Skip to product preview
        </a>
        <div className="myth-world" aria-hidden="true">
          {!staticMode && (
            <JourneyWorld
              paused={false}
              onReady={onReady}
              onError={onError}
              onInitialize={onWorldStart}
            />
          )}
        </div>
        <div className="myth-scrim" aria-hidden="true" />

        <section
          className="journey"
          ref={journey}
          aria-label="The story of Lattern"
        >
          {!staticMode && (
            <div className="journey-anchors" aria-hidden="true">
              {anchors.map((id, i) => (
                <span
                  id={id}
                  key={id}
                  style={{
                    top: `calc(${(i / STORY_END) * 100}% - ${(i / STORY_END) * 100}svh)`,
                  }}
                />
              ))}
            </div>
          )}
          <div className="journey-stage" ref={stage} data-step="0" data-hop="0">
            {LATTERN_SCENES.map((scene, index) => (
              <section
                key={scene.id}
                id={staticMode ? scene.id : undefined}
                data-chapter-id={scene.id}
                className={`story-panel ${[3, 4, 5].includes(index) ? "panel-identity" : ""} ${index === 11 ? "panel-network" : ""} ${index >= 4 && index <= 10 ? "panel-celestial" : ""}`}
                ref={(node) => {
                  panels.current[index] = node;
                }}
                aria-labelledby={`${scene.id}-title`}
              >
                <div className="story-copy">
                  {index === 0 ? (
                    <h1 id={`${scene.id}-title`}>
                      {scene.title.split("\n").map((line, i) => (
                        <span className="chapter-title-line" key={i}>
                          <RollingText text={line} />
                        </span>
                      ))}
                    </h1>
                  ) : (
                    <h2 id={`${scene.id}-title`}>
                      {scene.title.split("\n").map((line, i) => (
                        <span className="chapter-title-line" key={i}>
                          {i === 1 ? (
                            <em>
                              <RollingText text={line} />
                            </em>
                          ) : (
                            <RollingText text={line} />
                          )}
                        </span>
                      ))}
                    </h2>
                  )}
                  <p className="story-line">
                    {scene.copy}
                  </p>
                  <p className="chapter-aside">
                    {scene.aside}
                  </p>
                  <p className="chapter-context">{scene.kicker}</p>
                  <ReferenceDetails index={index} />
                  {index === 0 && (
                    <button className="myth-button" onClick={() => jump(1)}>
                      Scroll to find your light ↓
                    </button>
                  )}
                  {index === 11 && (
                    <div className="hero-actions">
                      <a className="myth-button" href="#demo">
                        Launch Lattern ↗
                      </a>
                      <p>Explore the interactive demo · Sample agents</p>
                      <Link href="/docs">
                        Docs <small>the scoring paper</small>
                      </Link>
                      <span>
                        View Contracts <small>Not published yet</small>
                      </span>
                      <span>
                        GitHub <small>Not published yet</small>
                      </span>
                    </div>
                  )}
                </div>
              </section>
            ))}
            <div className="story-progress">
              <span>
                {String(active + 1).padStart(2, "0")} <i>/</i> &nbsp;{" "}
                {LATTERN_SCENES[active].name}
              </span>
              <div>
                <span ref={progressBar} />
              </div>
              <button
                className="next-scene"
                aria-label={
                  active < 11 ? "Go to the next scene" : "Go to the agent demo"
                }
                onClick={() =>
                  active < 11
                    ? jump(active + 1)
                    : document
                        .getElementById("demo")
                        ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth" })
                }
              >
                ↓
              </button>
            </div>
          </div>
        </section>
        <section id="demo" className="demo-section">
          <ProductPreview />
        </section>
        <button
          className="reading-toggle"
          aria-label={`${LATTERN_SCENES[active].name}. ${reading ? "Return to animated story" : "Read story without animation"}`}
          onClick={() => {
            setReading(!reading);
          }}
          disabled={unavailable || reduced}
        >
          <SectionName text={LATTERN_SCENES[active].name} />
        </button>
      </main>
    </>
  );
}
