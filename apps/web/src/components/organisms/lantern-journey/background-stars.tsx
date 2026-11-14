"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { journeyState } from "@/libs/cinematic/chapter-transition";

export function BackgroundStars({ anchor }: { anchor: RefObject<Vector3> }) {
  const points = useRef<Points>(null);
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      still: { value: 0 },
      pixelRatio: { value: 1 },
      chapters: { value: new Float32Array(12) },
    }),
    []
  );
  const geometry = useMemo(() => {
    let seed = 731;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const positions = [],
      seeds = [],
      meteors = [],
      chapters = [];
    for (let i = 0; i < 1800; i++) {
      const chapter = Math.floor(i / 150),
        angle = random() * Math.PI * 2;
      let x = (random() - 0.5) * 38,
        y = (random() - 0.5) * 24;
      const radius = 5 + random() * 7;
      if (chapter === 2 || chapter === 4 || chapter === 11) {
        x = Math.cos(angle) * radius * 1.5;
        y = Math.sin(angle) * radius * 0.65;
      } else if (chapter === 1 || chapter === 5 || chapter === 7) {
        y = x * (chapter === 5 ? 0.45 : -0.3) + (random() - 0.5) * 7;
      } else if (chapter === 3 || chapter === 6) {
        x = (i % 2 ? 1 : -1) * (5 + random() * 9);
      } else if (chapter === 8) {
        y = ((i % 3) - 1) * 5 + (random() - 0.5) * 2.5;
      } else if (chapter === 9 || chapter === 10) {
        const cluster = i % (chapter === 9 ? 3 : 2);
        x = (cluster - 1) * 9 + (random() - 0.5) * 7;
        y = Math.sin(cluster * 2) * 5 + (random() - 0.5) * 6;
      }
      positions.push(x, y, -3 - random() * 22);
      seeds.push(random());
      meteors.push(0);
      chapters.push(Math.floor(i / 150));
    }
    for (let i = 0; i < 5; i++) {
      positions.push(
        (random() - 0.5) * 32,
        (random() - 0.5) * 16,
        -8 - random() * 8
      );
      seeds.push(random());
      chapters.push(0);
      meteors.push(1);
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setAttribute("meteor", new Float32BufferAttribute(meteors, 1));
    result.setAttribute("seed", new Float32BufferAttribute(seeds, 1));
    result.setAttribute("chapter", new Float32BufferAttribute(chapters, 1));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock, gl }) => {
    if (!material.current) return;
    const live = material.current.uniforms;
    live.time.value = journeyState.reducedMotion ? 0 : clock.elapsedTime;
    live.still.value = journeyState.reducedMotion ? 1 : 0;
    live.pixelRatio.value = gl.getPixelRatio();
    live.chapters.value.set(journeyState.chapters);
    if (points.current) points.current.position.z = anchor.current.z;
  });
  return (
    <points ref={points} geometry={geometry}>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
        attribute float seed; attribute float chapter; attribute float meteor;
        uniform float time; uniform float still; uniform float pixelRatio; uniform float chapters[12];
        varying float brightness; varying float warmth; varying float shooting;
        void main() {
          shooting = meteor;
          float pulse = .72 + .025 * sin(time * .12 + seed * 93.);
          brightness = chapters[int(chapter)] * mix(pulse, .65, still);
          warmth = seed;
          vec3 location = position;
          float flight = mod(time + seed * 29., 19. + seed * 11.);
          if (meteor > .5) {
            float travel = flight / 1.25;
            location.xy += vec2(12., -6.) * travel;
            brightness = (1. - still) * smoothstep(0., .12, flight) * (1. - smoothstep(.65, 1.25, flight));
          }
          vec4 view = modelViewMatrix * vec4(location, 1.);
          gl_Position = projectionMatrix * view;
          gl_PointSize = clamp((100. + seed * 110.) / max(1., -view.z), 5., 26.) * pixelRatio;
          if (meteor > .5) gl_PointSize = 150. * pixelRatio;
        }`}
        fragmentShader={`
        varying float brightness; varying float warmth; varying float shooting;
        void main() {
          if (shooting > .5) {
            vec2 uv = gl_PointCoord;
            float trail = exp(-pow((uv.y - (.22 + uv.x * .5)) * 100., 2.));
            float taper = pow(uv.x, 2.) * (1. - smoothstep(.88, 1., uv.x));
            gl_FragColor = vec4(vec3(1., .88, .68), trail * taper * brightness * .75);
            return;
          }
          float r = length(gl_PointCoord - .5);
          float edge = 1. - smoothstep(.35, .5, r);
          float halo = exp(-r * r * 32.) * .09;
          float core = exp(-r * r * 650.);
          vec3 tint = mix(vec3(.65,.8,1.), vec3(1.,.85,.6), warmth);
          gl_FragColor = vec4(tint * 2.4, (core + halo) * edge * brightness);
        }`}
      />
    </points>
  );
}
