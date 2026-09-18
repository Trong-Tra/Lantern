"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lanternSceneState } from "@/components/experience/scene-state";

interface LanternParticlesProps {
  readonly count?: number;
}

/**
 * Deterministic pseudo-random number generator to guarantee render purity in React 19
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function LanternParticles({ count = 45 }: Readonly<LanternParticlesProps>) {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate initial particle positions, velocities, and seeds deterministically
  const [positions, velocities, seeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const sds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const rSeed1 = pseudoRandom(i * 3 + 1);
      const rSeed2 = pseudoRandom(i * 3 + 2);
      const rSeed3 = pseudoRandom(i * 3 + 3);

      const radius = 0.3 + rSeed1 * 1.2;
      const angle = rSeed2 * Math.PI * 2;
      const height = (rSeed3 - 0.5) * 2.2;

      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      vel[i * 3] = (pseudoRandom(i * 7 + 1) - 0.5) * 0.003;
      vel[i * 3 + 1] = 0.003 + pseudoRandom(i * 7 + 2) * 0.006;
      vel[i * 3 + 2] = (pseudoRandom(i * 7 + 3) - 0.5) * 0.003;

      sds[i] = pseudoRandom(i * 11 + 4) * 100;
    }

    return [pos, vel, sds];
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;

    const energy = lanternSceneState.particleEnergy;
    const material = pointsRef.current.material as THREE.PointsMaterial;
    
    // Scale opacity with energy
    material.opacity = Math.min(energy * 0.85, 0.85);

    if (energy <= 0.01) {
      pointsRef.current.visible = false;
      return;
    }
    pointsRef.current.visible = true;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const currentPositions = posAttr.array as Float32Array;

    const time = performance.now() * 0.001;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Drift upward and oscillate gently
      currentPositions[idx + 1] += velocities[idx + 1] * (1 + energy * 1.5);
      currentPositions[idx] += Math.sin(time * 1.2 + seeds[i]) * 0.002;
      currentPositions[idx + 2] += Math.cos(time * 1.2 + seeds[i]) * 0.002;

      // Reset when floating too high
      if (currentPositions[idx + 1] > 1.8) {
        currentPositions[idx + 1] = -1.2;
        const resetSeed = time * 0.5 + i;
        const radius = 0.3 + pseudoRandom(resetSeed) * 0.9;
        const angle = pseudoRandom(resetSeed + 1) * Math.PI * 2;
        currentPositions[idx] = Math.cos(angle) * radius;
        currentPositions[idx + 2] = Math.sin(angle) * radius;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#fce7c8"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
