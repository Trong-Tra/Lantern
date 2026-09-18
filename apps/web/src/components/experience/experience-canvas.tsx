"use client";

import { Lantern } from "@/components/lantern";
import { Canvas } from "@react-three/fiber";
import { useSyncExternalStore } from "react";
import { CameraRig } from "./camera-rig";
import { Network } from "./network";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
}

export function ExperienceCanvas() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div
        className="bg-void pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 h-screen w-full overflow-hidden"
      aria-hidden="true"
    >
      <Canvas
        camera={{
          position: [0, 0.2, 6.2],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
      >
        {/* Soft background ambient light */}
        <ambientLight intensity={0.12} color="#fce7c8" />

        {/* Subtle directional rim light */}
        <directionalLight
          position={[3, 5, 4]}
          intensity={0.2}
          color="#836ef9"
        />

        {/* Camera Rig with scroll and parallax interpolation */}
        <CameraRig />

        {/* The 3D Lantern */}
        <Lantern position={[0, 0, 0]} />

        {/* The living system revealed by the lantern */}
        <Network />
      </Canvas>
    </div>
  );
}
