"use client";
import { startPathPrecompute } from "@/libs/cinematic/precomputed-paths";
import { lanternFlight } from "@/libs/cinematic/flight-choreography";
import { warpFlight } from "@/libs/cinematic/warp-flight";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, Lightformer } from "@react-three/drei";
import {
  Component,
  Suspense,
  useMemo,
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  AdditiveBlending,
  ShaderMaterial,
  PointLight,
  Box3,
  Vector3,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  LineSegments,
  LineBasicMaterial,
  PointsMaterial,
  MeshStandardMaterial,
  Mesh,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Vector2 } from "three";
import {
  journeyState,
  signalPosition,
  agentPose,
  sectionThreePath,
  networkHandoff,
  networkClockRuns,
  ease,
  universeDepth,
  entranceReveal,
  currentIgnition,
} from "@/libs/cinematic/chapter-transition";

import { LineWorld } from "./line-world";
import { LivingLight } from "./living-light";
import { NetworkLinks } from "./network-links";
import { HeroicBackground } from "./heroic-background";
import { ChapterPlanets } from "./chapter-planets";
import { CosmicBackdrops } from "./cosmic-backdrops";
import { BackgroundStars } from "./background-stars";
import { PortalCrossing } from "./portal-crossing";
import { AgentSoul } from "./agent-soul";
function Finish() {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    // Bloom is soft by design; render its full-screen passes at CSS resolution.
    c.setPixelRatio(1);
    c.addPass(new RenderPass(scene, camera));
    c.addPass(new UnrealBloomPass(new Vector2(1, 1), 0.38, 0.45, 1.2));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);
  const composerRef = useRef(composer);
  useEffect(() => { composerRef.current = composer; }, [composer]);
  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);
  useEffect(
    () => () => {
      composer.passes.forEach((pass) => pass.dispose());
      composer.dispose();
    },
    [composer]
  );
  useFrame((_, dt) => {
    const bloom = composerRef.current.passes[1] as UnrealBloomPass;
    const presence = ease(journeyState.chapters[2]);
    const sculpture = journeyState.chapters.slice(4, 11).reduce((sum, weight) => sum + weight, 0);
    bloom.strength = (0.38 + sculpture * .04) * (1 - presence);
    bloom.radius = 0.45;
    composerRef.current.render(dt);
  }, 1);
  return null;
}
function Relic() {
  const model = useRef<Group>(null);
  const { scene } = useGLTF("/models/lantern.glb");
  const object = useMemo(() => {
    const copy = scene.clone(true);
    const pole = copy.getObjectByName("LanternPole_Body");
    if (pole) pole.removeFromParent();
    copy.traverse((node) => {
      if (
        node instanceof Mesh &&
        node.material instanceof MeshStandardMaterial
      ) {
        node.material = node.material.clone();
        node.material.emissiveIntensity = 0.12;
        // The source model bakes an opaque bulb into its emissive glass texture.
        // Open those pixels so the real candle inside becomes visible.
        node.material.transparent = true;
        node.material.depthWrite = false;
        node.material.onBeforeCompile = (
          shader: Parameters<MeshStandardMaterial["onBeforeCompile"]>[0]
        ) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
             float glass = smoothstep(0.012, 0.045, max(totalEmissiveRadiance.r,max(totalEmissiveRadiance.g,totalEmissiveRadiance.b)));
             diffuseColor.a = mix(1.0,0.17,glass);
             totalEmissiveRadiance *= 0.08;`
          );
        };
        node.material.customProgramCacheKey = () => "lantern-candle-glass-v1";
        node.material.envMapIntensity = 1.35;
      }
    });
    const bounds = new Box3().setFromObject(copy);
    const center = bounds.getCenter(new Vector3()),
      size = bounds.getSize(new Vector3());
    const scale = 4.5 / Math.max(size.x, size.y, size.z);
    copy.position.copy(center.multiplyScalar(-scale));
    copy.scale.setScalar(scale);
    return copy;
  }, [scene]);
  useEffect(
    () => () =>
      object.traverse((node) => {
        if (
          node instanceof Mesh &&
          node.material instanceof MeshStandardMaterial
        )
          node.material.dispose();
      }),
    [object]
  );
  useFrame(({ clock }) => {
    model.current?.traverse((node) => {
      if (node instanceof Mesh && node.material instanceof MeshStandardMaterial)
        node.material.emissiveIntensity =
          0.35 *
          currentIgnition().flame *
          candlePulse(journeyState.reducedMotion ? 0 : clock.elapsedTime);
    });
  });
  return <primitive ref={model} object={object} dispose={null} />;
}
function candlePulse(time: number) {
  // Later orbital chapters move continuously without modulating the scene light.
  const steady = journeyState.chapters.slice(4, 11).reduce((sum, weight) => sum + weight, 0);
  const phase = (time % 3.2) / 3.2;
  const beat =
    Math.exp(-Math.pow((phase - 0.15) / 0.055, 2)) * 0.3 +
    Math.exp(-Math.pow((phase - 0.31) / 0.07, 2)) * 0.18;
  return (
    1 + (beat - 0.15 + Math.sin(time * 7.1) * 0.035 + Math.sin(time * 11.7) * 0.025) * (1 - steady)
  );
}
function Candle() {
  const fire = useRef<ShaderMaterial>(null);
  const burning = useRef<Group>(null);
  const flameShape = useMemo(
    () => [
      new Vector2(0, 0),
      new Vector2(0.07, 0.04),
      new Vector2(0.115, 0.13),
      new Vector2(0.085, 0.27),
      new Vector2(0.035, 0.43),
      new Vector2(0, 0.61),
    ],
    []
  );
  const uniforms = useMemo(
    () => ({ time: { value: 0 }, pulse: { value: 1 } }),
    []
  );
  useFrame(({ clock }) => {
    const time = journeyState.reducedMotion ? 0 : clock.elapsedTime;
    if (fire.current) {
      fire.current.uniforms.time.value = time;
      const ignition = currentIgnition().flame;
      fire.current.uniforms.pulse.value = candlePulse(time) * ignition;
      if (burning.current) {
        burning.current.visible = ignition > 0;
        burning.current.scale.setScalar(Math.max(0.001, ignition));
      }
    }
  });
  return (
    <group>
      <mesh position={[0, -1.35, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.75, 32]} />
        <meshStandardMaterial color="#d4bd8a" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.94, 0]}>
        <cylinderGeometry args={[0.012, 0.015, 0.09, 8]} />
        <meshStandardMaterial color="#26170e" />
      </mesh>
      <group ref={burning} position={[0, -0.91, 0]}>
        <mesh>
          <latheGeometry args={[flameShape, 32]} />
          <shaderMaterial
            ref={fire}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            toneMapped={false}
            vertexShader={`varying vec2 vUv; uniform float time; uniform float pulse; void main(){vUv=uv;vec3 p=position;p.x+=sin(time*6.7+p.y*7.)*p.y*.075;p.z+=sin(time*4.3+p.y*11.)*p.y*.035;p.y*=.9+pulse*.12;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`}
            fragmentShader={`varying vec2 vUv; uniform float time; uniform float pulse; void main(){float edge=pow(sin(vUv.x*3.14159),.35);vec3 heat=mix(vec3(1.9,1.1,.27),vec3(1.2,.26,.035),smoothstep(.15,.95,vUv.y));heat=mix(vec3(.3,.48,1.),heat,smoothstep(.0,.15,vUv.y));gl_FragColor=vec4(heat*pulse*1.6,(.72+.2*edge)*(1.-smoothstep(.8,1.,vUv.y)));}`}
          />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshBasicMaterial color="#fff1bb" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

// Per-chapter blocking: position, depth, scale and attitude evolve with the story.
const LANTERN_SHOTS = [
  [1.5, 0, 0, 1.05, -0.35, 0.02, -0.02],
  [1.65, 0, 0.35, 1.12, 0.15, -0.04, 0.02],
  [3.6, -1.0, -0.8, 1.0, 0.65, 0.06, -0.05],
  [0, -0.85, -0.65, 0.4, -0.15, 0, 0],
  [0, 0.2, -0.5, 0.66, 0.2, 0, -0.02],
  [0, 0.15, -0.6, 0.64, -0.3, 0, 0.02],
  [0, 0.3, -0.7, 0.68, 0.25, 0, -0.02],
  [0, 0.15, -0.5, 0.66, -0.2, 0, 0.02],
  [0, 0.2, -0.7, 0.64, 0.3, 0, 0],
  [0, 0.2, -0.6, 0.7, -0.2, 0, -0.02],
  [0, 0.15, -0.6, 0.66, 0.25, 0, 0.02],
  [0, 2.0, -0.6, 0.55, 0, 0, 0],
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function Signals() {
  const dots = useRef<Points>(null),
    links = useRef<LineSegments>(null);
  const resources = useMemo(() => {
    const destinations = Array.from({ length: 5 }, (_, scene) =>
      Array.from({ length: 48 }, (_, i) => signalPosition(scene, i))
    );
    const dotPositions = new Float32Array(48 * 3),
      linePositions = new Float32Array(96 * 2 * 3);
    const pointGeometry = new BufferGeometry();
    pointGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(dotPositions, 3)
    );
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(linePositions, 3)
    );
    const pairs: [number, number][] = [];
    for (let i = 0; i < 48; i++) {
      const origin = destinations[4][i];
      const nearest = destinations[4]
        .map((point, j) => ({
          index: j,
          distance: point.reduce(
            (sum, value, axis) => sum + (value - origin[axis]) ** 2,
            0
          ),
        }))
        .filter((point) => point.index !== i)
        .sort((a, b) => a.distance - b.distance);
      pairs.push([i, nearest[0].index], [i, nearest[1].index]);
    }
    return { destinations, pointGeometry, lineGeometry, pairs };
  }, []);
  useEffect(
    () => () => {
      resources.pointGeometry.dispose();
      resources.lineGeometry.dispose();
    },
    [resources]
  );
  useFrame(({ clock }) => {
    const { from, to, mix, weights, reducedMotion, tail } = journeyState;
    const time = reducedMotion ? 0 : clock.elapsedTime;
    if (!dots.current || !links.current) return;
    const position = dots.current.geometry.attributes.position;
    for (let i = 0; i < 48; i++) {
      const a = resources.destinations[from][i],
        b = resources.destinations[to][i];
      const float =
        (weights[1] * 0.15 + weights[0] * 0.04) * Math.sin(time * 0.5 + i);
      position.setXYZ(
        i,
        lerp(a[0], b[0], mix) + Math.sin(time * 0.24 + i) * weights[4] * 0.12,
        lerp(a[1], b[1], mix) +
          float +
          Math.sin(time * 0.45 + i * 0.7) *
            (weights[2] * 0.1 + weights[4] * 0.08),
        lerp(a[2], b[2], mix)
      );
    }
    position.needsUpdate = true;
    const lines = links.current.geometry.attributes.position;
    resources.pairs.forEach(([a, b], i) => {
      lines.setXYZ(i * 2, position.getX(a), position.getY(a), position.getZ(a));
      lines.setXYZ(
        i * 2 + 1,
        position.getX(b),
        position.getY(b),
        position.getZ(b)
      );
    });
    lines.needsUpdate = true;
    if (links.current) {
      const material = links.current.material as LineBasicMaterial;
      material.opacity =
        (weights[2] * 0.1 + weights[3] * 0.09 + weights[4] * 0.18) *
        (1 - tail * 0.75) *
        (journeyState.chapters[5] + journeyState.chapters[11]);
    }
    if (dots.current) {
      const material = dots.current.material as PointsMaterial;
      material.opacity =
        (0.35 + weights[1] * 0.35 + weights[4] * 0.4) * (1 - tail * 0.7);
      material.size = 0.035 + weights[2] * 0.015 + weights[4] * 0.015;
    }
    // Recompute bounds as points migrate between the five configurations.
    dots.current.geometry.computeBoundingSphere();
    links.current.geometry.computeBoundingSphere();
  });
  return (
    <>
      <points ref={dots} geometry={resources.pointGeometry}>
        <pointsMaterial
          color="#ffe0a0"
          size={0.045}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </points>
      <lineSegments ref={links} geometry={resources.lineGeometry}>
        <lineBasicMaterial
          color="#c4a271"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}

// One persistent mesh: brass pieces bend, separate and reassemble between chapters.
// Camera-facing light diffraction, with no solid body or orbital ring.
function StarLight({ index }: { index: number }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      seed: { value: index * 0.6180339 },
      variant: { value: index % 4 },
    }),
    [index]
  );
  useFrame(({ clock }) => {
    if (material.current)
      material.current.uniforms.time.value = journeyState.reducedMotion
        ? 0
        : clock.elapsedTime;
  });
  return (
    <mesh rotation={[0, 0, index * 1.37]}>
      <planeGeometry
        args={[0.5 + (index % 3) * 0.08, 0.5 + (index % 3) * 0.08]}
      />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
        vertexShader={`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`}
        fragmentShader={`
        varying vec2 vUv; uniform float time; uniform float seed; uniform float variant;
        float crossRay(vec2 p){return exp(-abs(p.x)*95.)*exp(-abs(p.y)*13.)+exp(-abs(p.y)*95.)*exp(-abs(p.x)*13.);}
        void main(){
          vec2 p=vUv-.5; float r=length(p);
          float twinkle=smoothstep(-.25,.85,sin(time*(.4+fract(seed)*.6)+seed*17.));
          float core=exp(-r*85.);
          float glow=exp(-r*r*34.)*.09;
          float rays=crossRay(p)*(variant<.5?.035:.32);
          if(variant>2.5){vec2 q=mat2(.707,-.707,.707,.707)*p; rays+=crossRay(q)*.12;}
          float light=(core+glow+rays)*twinkle*(1.-smoothstep(.32,.5,r));
          vec3 tint=mix(vec3(1.,.83,.58),vec3(.7,.87,1.),step(.67,fract(seed)));
          gl_FragColor=vec4(tint*2.4,light);
        }`}
      />
    </mesh>
  );
}

// Chapter two travels along fixed links; later chapters retain their own actions.
function GuidedAgents({ lantern }: { lantern: RefObject<Group | null> }) {
  const networkTime = useRef(0);
  const agents = useRef<(Group | null)[]>([]);
  const packets = useRef<(Mesh | null)[]>([]);
  const thread = useRef<LineSegments>(null);
  const positions = useRef(Array.from({ length: 16 }, () => new Vector3()));
  const initialized = useRef(false);
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(16 * 6), 3)
    );
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock, gl, camera }, delta) => {
    if (!lantern.current || !thread.current) return;
    const { reducedMotion, tail, chapters } = journeyState;
    const time = reducedMotion ? 0 : clock.elapsedTime;
    const mobile = gl.domElement.clientWidth < 760;
    const space = mobile ? 0.55 : 1;
    if (
      networkClockRuns(chapters) &&
      !reducedMotion
    )
      networkTime.current += Math.min(delta, 0.05);
    else if (chapters[1] + chapters[2] < 0.001) networkTime.current = 0;
    const lanternPosition = lantern.current.position;
    const leader = lanternPosition.clone();
    leader.y -= lantern.current.scale.y * 0.65 * (1 - chapters[1]);
    const attribute = thread.current.geometry.attributes.position;
    positions.current.forEach((position, index) => {
      const previous = index === 0 ? leader : positions.current[index - 1];
      const target = leader.clone();
      let size = 0;
      chapters.forEach((weight, chapter) => {
        if (weight < 0.001) return;
        const pose = agentPose(
          chapter,
          index,
          chapter === 1 ? networkTime.current : time
        );
        target.x += pose.x * weight * space;
        target.y += pose.y * weight * space;
        target.z += pose.z * weight * space;
        size += pose.scale * weight;
      });
      if (journeyState.transition === 1 || chapters[2] > 0.999) {
        const crossing =
          journeyState.transition === 1 ? journeyState.portal : 1;
        const travel =
          0.5 -
          0.5 *
            Math.cos(
              Math.max(0, networkTime.current - 1.2 - index * 0.08) * 0.65
            );
        const handoff = networkHandoff(crossing);
        const incoming = crossing >= 0.5;
        const pathProgress = incoming
          ? (networkTime.current * 0.06 + index * 0.381966) % 1
          : travel;
        const pose = sectionThreePath(index, pathProgress, 5, networkTime.current, incoming ? 1 : 0);
        const turn = incoming ? handoff.incomingTurn : handoff.outgoingTurn;
        target.copy(lanternPosition).add(new Vector3(
          pose.x * Math.cos(turn) + pose.z * Math.sin(turn),
          pose.y,
          -pose.x * Math.sin(turn) + pose.z * Math.cos(turn)
        ).multiplyScalar(space));
        // Stars vanish at the layer exchange; no visible flight between assemblies.
        const presence = incoming
          ? 0
          : 1 - ease(crossing / 0.5);
        size = 0.85 * presence;
      }
      if (
        journeyState.transition === 1 ||
        !initialized.current ||
        reducedMotion ||
        chapters[0] > 0.999 ||
        chapters[1] > 0.999
      )
        position.copy(target);
      else position.lerp(target, 1 - Math.exp(-5 * Math.min(delta, 0.05)));
      const agent = agents.current[index];
      if (agent) {
        agent.position.copy(position);
        agent.quaternion.copy(camera.quaternion);
        agent.scale.setScalar(size * (1 - chapters[2] - chapters[3] - chapters.slice(4, 11).reduce((sum, weight) => sum + weight, 0)) * (mobile ? 0.7 : 1) * (1 - tail * 0.8));
      }
      attribute.setXYZ(index * 2, previous.x, previous.y, previous.z);
      attribute.setXYZ(index * 2 + 1, position.x, position.y, position.z);
      const packet = packets.current[index];
      if (packet) {
        const progress = (time * 0.65 - index * 0.08 + 100) % 1;
        packet.position.copy(previous).lerp(position, progress);
        packet.scale.setScalar(
          Math.sin(progress * Math.PI) *
            (1 - tail) *
            chapters[11]
        );
      }
    });
    initialized.current = true;
    attribute.needsUpdate = true;
    thread.current.geometry.computeBoundingSphere();
    (thread.current.material as LineBasicMaterial).opacity =
      (chapters[11] * 0.28) * (1 - tail);
  });
  return (
    <>
      <NetworkLinks lantern={lantern} time={networkTime} />
      <lineSegments ref={thread} geometry={geometry}>
        <lineBasicMaterial
          color="#e3bb79"
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      {Array.from({ length: 16 }, (_, i) => (
        <group
          key={i}
          ref={(node) => {
            agents.current[i] = node;
          }}
        >
          <StarLight index={i} />
        </group>
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            packets.current[i] = node;
          }}
        >
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshBasicMaterial color="#fff0bf" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Passage({ onReady }: { onReady: () => void }) {
  const scenery = useRef<Group>(null);
  const chapterObjects = useRef<Group>(null);
  const worldLights = useRef<Group>(null);
  const stageAnchor = useRef(new Vector3());
  const flame = useRef<PointLight>(null);
  const revealedSpace = useRef<Group>(null);
  const motes = useRef<Points>(null);
  const root = useRef<Group>(null),
    cameraTarget = useMemo(() => new Vector3(), []);
  const { invalidate, gl } = useThree();
  const rendered = useRef(false);
  useEffect(() => {
    const refresh = () => invalidate();
    window.addEventListener("scroll", refresh, { passive: true });
    return () => window.removeEventListener("scroll", refresh);
  }, [invalidate]);
  const dust = useMemo(() => {
    let seed = 76;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const vertices = [];
    for (let i = 0; i < 850; i++)
      vertices.push(
        (random() - 0.5) * 42,
        (random() - 0.5) * 26,
        -random() * 25
      );
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    return geometry;
  }, []);
  useEffect(() => () => dust.dispose(), [dust]);
  useFrame(({ camera, clock }) => {
    if (!rendered.current) {
      rendered.current = true;
      onReady();
    }
    const { chapters, reducedMotion, pointerX, pointerY, tail } = journeyState;
    const sculptureWeight = chapters.slice(4, 11).reduce((sum, weight) => sum + weight, 0);
    const entrance = entranceReveal(
      reducedMotion || journeyState.entranceAt === 0
        ? 10
        : journeyState.entranceAt < 0
          ? 10
          : (performance.now() - journeyState.entranceAt) / 1000
    );
    const time = reducedMotion ? 0 : clock.elapsedTime,
      mobile = gl.domElement.clientWidth < 760;
    const ignition = currentIgnition();
    if (revealedSpace.current) {
      revealedSpace.current.visible = ignition.space > 0;
      revealedSpace.current.scale.setScalar(1);
    }
    if (worldLights.current)
      worldLights.current.children.forEach((light) => {
        if ("intensity" in light) {
          light.userData.fullIntensity ??= light.intensity;
          light.intensity =
            light.userData.fullIntensity * (0.035 + ignition.space * 0.965);
        }
      });
    if (flame.current)
      flame.current.intensity =
        24 *
        ignition.flame *
        candlePulse(time) *
        (1 + chapters[1] * 0.25 + chapters[6] * 0.45 + chapters[11] * 0.6);
    if (motes.current) {
      motes.current.visible = chapters[2] + chapters[3] + sculptureWeight < 0.001;
      motes.current.rotation.y = Math.sin(time * 0.025) * 0.15;
      motes.current.position.y = Math.sin(time * 0.12) * 0.3;
    }
    const depth = universeDepth(
      chapters,
      journeyState.transition,
      journeyState.portal
    );
    if (worldLights.current) worldLights.current.position.z = depth.world;
    if (scenery.current) {
      scenery.current.visible = chapters[2] + chapters[3] + sculptureWeight < 0.001;
      scenery.current.scale.setScalar(mobile ? 0.55 : 1);
      scenery.current.position.set(0, mobile ? 2.6 : 0, depth.world);
    }
    const shot = Array<number>(7).fill(0);
    chapters.forEach((weight, index) =>
      LANTERN_SHOTS[index].forEach((value, axis) => {
        shot[axis] += value * weight;
      })
    );
    camera.position.set(
      reducedMotion ? 0 : pointerX * 0.15,
      reducedMotion ? 0 : -pointerY * 0.1,
      (mobile ? 11 : 10) + Math.sin(time * 0.23) * 0.1 + depth.camera
    );
    cameraTarget.set(0, chapters[2] * 0.25, -0.25 + depth.world);
    camera.position.y -= chapters[2] * (mobile ? 0.3 : 0.6);
    camera.position.z -= chapters[2] * (mobile ? 1.4 : 3.8) + chapters[3] * (mobile ? 0.6 : 2.2);
    camera.lookAt(cameraTarget);
    if (root.current) {
      root.current.visible = chapters[2] < 0.95;
      const halfWidth = (camera.position.z - shot[2] - depth.world) / camera.projectionMatrix.elements[0];
        const originalX = shot[0] - (mobile ? 0 : chapters[3] * halfWidth * 0.5),
        artSide = -chapters[4] - chapters[5] + chapters.slice(6, 11).reduce((sum, weight) => sum + weight, 0),
        x = originalX + (mobile ? 0 : halfWidth * .48 * artSide),
        y = shot[1];
      const openingOffsetX = halfWidth * 0.2 * chapters[0];
      stageAnchor.current.set(
        (mobile ? x * 0.2 * (1 - sculptureWeight) : x) + openingOffsetX,
        mobile ? 2.6 + tail : y + tail * 2,
        shot[2] + depth.world
      );
      const action =
        chapters[1] * 0.3 +
        chapters[5] * 0.4 +
        chapters[6] * 0.55 +
        chapters[9] * 0.35;
      const quietAction = action * (1 - sculptureWeight);
      const patrol = Math.sin(time * 0.48);
      const handoff =
        reducedMotion || journeyState.transition === 3
          ? 0
          : Math.sin(journeyState.portal * Math.PI);
      const direction = journeyState.transition % 2 === 0 ? 1 : -1;
      const pass =
        journeyState.transition === 3
          ? ease((journeyState.portal - 0.5) / 0.5)
          : 0;
      const objectOffsetX = sculptureWeight * 1.25;
      const objectOffsetY = -sculptureWeight * .55;
      root.current.position.set(
        (mobile ? x * 0.2 * (1 - sculptureWeight) : x) + openingOffsetX + objectOffsetX * (mobile ? .4 : 1) +
          patrol * quietAction * (mobile ? 0.55 : 1) +
          Math.sin(pass * Math.PI) * (mobile ? 2 : 4) +
          direction * handoff * (mobile ? 0.32 : 0.8),
        (mobile ? 2.6 + tail : y + tail * 2) + objectOffsetY * (mobile ? .4 : 1),
        shot[2] + Math.cos(time * 0.48) * quietAction * 1.4 + depth.world
      );
      root.current.position.x *= ignition.settle;
      root.current.position.y *= ignition.settle;
      root.current.position.z *= ignition.settle;
      root.current.scale.setScalar(
        shot[3] *
          (mobile ? 0.46 + sculptureWeight * .16 : 1) *
          (1 - tail * 0.35) *
          Math.max(0.001, entrance.lantern)
      );
      root.current.rotation.set(
        shot[5] - chapters[2] * 0.16 + Math.sin(time * 0.72) * 0.04,
        shot[4] + chapters[2] * 0.3 +
          Math.sin(time * 0.48) * (0.12 + action * 0.6) +
          direction * handoff * 0.48,
        shot[6] +
          Math.sin(time * 0.72 + 0.5) * 0.04 -
          direction * handoff * 0.12
      );
      if (!reducedMotion && ignition.settle > .99) {
        // Blend both idle poses instead of changing phase at the dominant chapter.
        const flight = { x: 0, y: 0, z: 0, roll: 0 };
        chapters.forEach((weight, chapter) => {
          if (weight <= 0) return;
          const pose = lanternFlight(chapter, warpFlight.progress, time);
          flight.x += pose.x * weight;
          flight.y += pose.y * weight;
          flight.z += pose.z * weight;
          flight.roll += pose.roll * weight;
        });
        const restraint=mobile?.38:1;
        root.current.position.x+=flight.x*restraint*(1-chapters[11]);
        root.current.position.y+=flight.y*restraint*(1-chapters[11]);
        root.current.position.z+=flight.z*restraint*(1-chapters[11]);
        root.current.rotation.z+=flight.roll*restraint;
      }
      const candleScreen = new Vector3(0, -0.9, 0);
      root.current.updateMatrixWorld();
      candleScreen.applyMatrix4(root.current.matrixWorld).project(camera);
      journeyState.candleScreenX = candleScreen.x * 0.5 + 0.5;
      journeyState.candleScreenY = 0.5 - candleScreen.y * 0.5;
      // Chapter changes keep the camera level and stationary.

    }
  });
  return (
    <>
      <fog attach="fog" args={["#080b10", 17, 42]} />
      <CosmicBackdrops />
      <ChapterPlanets />
      <HeroicBackground />
      <ambientLight intensity={0.18} />
      <group ref={worldLights}>
        <spotLight
          position={[4, 5, 6]}
          color="#ffe0aa"
          intensity={110}
          angle={0.65}
          penumbra={1}
        />
        <pointLight position={[-5, 4, 3]} color="#8eb8c3" intensity={9} />
        <pointLight position={[0, 0, 3]} color="#ffd098" intensity={5} />
      </group>
      <Environment resolution={128}>
        <Lightformer
          form="rect"
          intensity={3}
          color="#ffe2b7"
          scale={[4, 8, 1]}
          position={[4, 2, 4]}
          rotation={[0, -0.7, 0]}
        />
        <Lightformer
          intensity={2}
          color="#9bbcc8"
          scale={[3, 6, 1]}
          position={[-5, 1, 2]}
          rotation={[0, 0.8, 0]}
        />
      </Environment>
      <group ref={root}>
        <Relic />
        <Candle />
        <pointLight
          ref={flame}
          position={[0, -0.6, 0]}
          color="#ffbd69"
          intensity={3}
          distance={5}
        />
      </group>
      <group ref={revealedSpace}>
        <LineWorld anchor={stageAnchor} />
        <LivingLight lantern={root} objects={chapterObjects} />
        <BackgroundStars anchor={stageAnchor} />
        <PortalCrossing />
        <AgentSoul lantern={root} />
        <GuidedAgents lantern={root} />
        <group ref={scenery}>
          <Signals />
        </group>
        <points ref={motes} geometry={dust}>
          <pointsMaterial
            color="#a7a193"
            size={0.012}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </points>
      </group>
      <Finish />
    </>
  );
}

class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function PathPrecompute({ onError }: { onError: () => void }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => startPathPrecompute(invalidate, onError), [invalidate, onError]);
  return null;
}
function ContextGuard({ onError }: { onError: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onError();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);
  return null;
}
export default function MythWorld({
  paused = false,
  onReady,
  onError,
  onInitialize,
}: {
  onReady: () => void;
  onError: () => void;
  onInitialize?: () => void;
  paused?: boolean;
}) {
  const reduced = useReducedMotion();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const change = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  return (
    <SceneBoundary onError={onError}>
      <Canvas
        onCreated={onInitialize}
        camera={{ position: [0, 0, 10], fov: 42, near: 0.1, far: 80 }}
        dpr={[1, 1.25]}
        frameloop={hidden ? "never" : reduced || paused ? "demand" : "always"}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <ContextGuard onError={onError} />
        <PathPrecompute onError={onError} />
        <Suspense fallback={null}>
          <Passage onReady={onReady} />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  );
}
