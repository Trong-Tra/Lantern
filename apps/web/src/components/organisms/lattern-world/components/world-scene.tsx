import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, FogExp2, Vector3 } from "three";

import { Lantern } from "@/components/organisms/cinematic-lantern";
import { cinematicState } from "@/libs/cinematic/runtime";

import { AgentNetwork } from "./agent-network";
import { SoulCore } from "./soul-core";
import { TrustPath } from "./trust-path";
import { Infrastructure } from "./infrastructure";
import { Atmosphere } from "./atmosphere";
import type { SceneProps } from "../types";

const screenLight = new Vector3();

export function WorldScene({
  reducedMotion,
  onReady,
  onUnavailable,
}: SceneProps) {
  const { gl, size } = useThree();
  const ambient = useRef<AmbientLight>(null);
  const fog = useRef<FogExp2>(null);
  const frames = useRef(0);
  const mobile = size.width < 768;

  useEffect(() => {
    const canvas = gl.domElement;
    const contextLost = (event: Event) => {
      event.preventDefault();
      onUnavailable?.();
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    return () => canvas.removeEventListener("webglcontextlost", contextLost);
  }, [gl, onUnavailable]);

  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75));
  }, [gl, mobile]);

  useFrame(({ camera }) => {
    const s = cinematicState;
    camera.position.set(s.cameraX, s.cameraY, s.cameraZ);
    camera.lookAt(s.targetX, s.targetY, s.targetZ);
    camera.updateMatrixWorld();
    screenLight.set(s.beamX, s.beamY, s.beamZ).project(camera);
    s.lightScreenX = (screenLight.x * 0.5 + 0.5) * 100;
    s.lightScreenY = (-screenLight.y * 0.5 + 0.5) * 100;
    if (ambient.current)
      ambient.current.intensity = 0.045 + s.ignition * 0.2 + s.finale * 0.2;
    if (fog.current) fog.current.density = 0.032 - s.finale * 0.012;
    // Report readiness after the renderer has completed a frame with all assets.
    if (frames.current === 1) onReady?.();
    frames.current = Math.min(2, frames.current + 1);
  }, -2);

  return (
    <>
      <fogExp2 ref={fog} attach="fog" args={["#080806", 0.032]} />
      <ambientLight ref={ambient} color="#e9b58a" intensity={0.045} />
      <directionalLight position={[4, 6, 2]} color="#c8b5a0" intensity={0.55} />
      <Lantern />
      <AgentNetwork mobile={mobile} reducedMotion={reducedMotion} />
      <SoulCore mobile={mobile} reducedMotion={reducedMotion} />
      <TrustPath mobile={mobile} reducedMotion={reducedMotion} />
      <Infrastructure mobile={mobile} reducedMotion={reducedMotion} />
      <Atmosphere mobile={mobile} reducedMotion={reducedMotion} />
    </>
  );
}
