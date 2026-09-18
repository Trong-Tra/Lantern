"use client";

import { Component } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";

import { WorldScene } from "./components/world-scene";
import type { BoundaryProps } from "./types";

export interface LatternWorldProps {
  readonly onReady?: () => void;
  readonly onUnavailable?: () => void;
  readonly reducedMotion: boolean;
}

class WorldBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onUnavailable?.();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function LatternWorld({
  onReady,
  onUnavailable,
  reducedMotion,
}: LatternWorldProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <WorldBoundary onUnavailable={onUnavailable}>
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0.15, 8], fov: 42, near: 0.1, far: 65 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: ACESFilmicToneMapping,
          }}
          fallback={
            <span>
              Your browser cannot display the 3D canvas. Use reading mode to
              explore Lattern.
            </span>
          }
          onCreated={({ gl }) => {
            gl.setClearColor("#080806", 0);
            gl.toneMappingExposure = 1.12;
          }}
        >
          <WorldScene
            reducedMotion={reducedMotion}
            onReady={onReady}
            onUnavailable={onUnavailable}
          />
        </Canvas>
      </WorldBoundary>
    </div>
  );
}

export default LatternWorld;
