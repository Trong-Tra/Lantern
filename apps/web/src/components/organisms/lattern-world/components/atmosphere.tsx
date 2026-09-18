import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, ShaderMaterial, Vector3 } from "three";

import { cinematicState } from "@/libs/cinematic/runtime";
import { discoveryBackdropFocus } from "@/libs/cinematic/discovery";
import { pathBackdropFocus } from "@/libs/cinematic/path-visibility";

import type { WorldSettings } from "../types";

const vertexShader = `
  uniform float uTime;
  uniform float uDpr;
  uniform vec3 uLantern;
  uniform vec3 uTarget;
  uniform float uIgnition;
  uniform float uFinale;
  uniform float uFinaleFocus;
  uniform float uMobile;
  uniform float uDiscoveryFocus;
  uniform float uPathFocus;
  uniform float uExecutionFocus;
  uniform float uEdgeFocus;
  attribute float aSeed;
  varying float vLight;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * .12 + aSeed * 40.) * .13;
    vec3 beam = normalize(uTarget - uLantern);
    float cone = smoothstep(.78, .97, dot(normalize(p-uLantern), beam));
    vLight = .035 + cone * uIgnition * .42 + uFinale * .2;
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * viewPosition;
    float screenX = gl_Position.x / gl_Position.w;
    float edgeX = .52 + clamp((screenX + 1.) * .5, 0., 1.) * .52;
    gl_Position.x = mix(screenX, edgeX, uEdgeFocus) * gl_Position.w;
    vLight *= 1. - uDiscoveryFocus * smoothstep(.15, .5, -screenX) * .96;
    vLight *= 1. - uPathFocus * smoothstep(-.1, .3, screenX) * .96;
    vLight *= 1. - uExecutionFocus * .95;
    float finaleEdge = smoothstep(.58, .95, abs(screenX)) * (1. - uMobile);
    vLight *= mix(1., mix(.015, .22, finaleEdge), uFinaleFocus);
    gl_PointSize = clamp((15. + aSeed * 20.) / -viewPosition.z * uDpr, 1., 5.);
  }
`;
const fragmentShader = `
  varying float vLight;
  void main() {
    float distanceToCenter = length(gl_PointCoord - .5);
    float alpha = (1. - smoothstep(.04, .5, distanceToCenter)) * vLight;
    gl_FragColor = vec4(1., .66, .31, alpha);
  }
`;

export function Atmosphere({ mobile, reducedMotion }: WorldSettings) {
  const material = useRef<ShaderMaterial>(null);
  const count = mobile ? 140 : 420;
  const data = useMemo(() => {
    let seed = 7281;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (random() - 0.5) * 24;
      positions[i * 3 + 1] = (random() - 0.5) * 15;
      positions[i * 3 + 2] = 3 - random() * 19;
      seeds[i] = random();
    }
    return { positions, seeds };
  }, [count]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDpr: { value: 1 },
      uIgnition: { value: 0 },
      uFinale: { value: 0 },
      uFinaleFocus: { value: 0 },
      uMobile: { value: 0 },
      uDiscoveryFocus: { value: 0 },
      uPathFocus: { value: 0 },
      uExecutionFocus: { value: 0 },
      uEdgeFocus: { value: 0 },
      uLantern: { value: new Vector3() },
      uTarget: { value: new Vector3() },
    }),
    []
  );

  useFrame(({ clock, gl }) => {
    if (!material.current) return;
    const s = cinematicState;
    const u = material.current.uniforms;
    u.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    u.uDpr.value = gl.getPixelRatio();
    u.uLantern.value.set(s.lanternX, s.lanternY, s.lanternZ);
    u.uTarget.value.set(s.beamX, s.beamY, s.beamZ);
    u.uIgnition.value = s.ignition;
    u.uFinale.value = s.finale;
    u.uFinaleFocus.value = s.finaleFocus;
    u.uMobile.value = mobile ? 1 : 0;
    u.uDiscoveryFocus.value = mobile ? 0 : discoveryBackdropFocus(s.progress);
    u.uPathFocus.value = mobile ? 0 : pathBackdropFocus(s.progress);
    u.uExecutionFocus.value = Math.max(s.executionFocus, s.infrastructureFocus);
    u.uEdgeFocus.value = mobile
      ? 0
      : Math.max(u.uPathFocus.value, u.uExecutionFocus.value);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.positions, 3]}
        />
        <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
