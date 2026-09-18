"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lanternSceneState } from "./scene-state";

interface FloatingLanternData {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly speedZ: number;
  readonly phase: number;
  readonly color: string;
  readonly scale: number;
}

/**
 * Deterministic pseudo-random number generator for purity
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const LANTERN_PALETTE = ["#f59e0b", "#f43f5e", "#fce7c8", "#fb923c", "#ec4899"] as const;

export function RiverNightScene() {
  const rootGroupRef = useRef<THREE.Group>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const riverMeshRef = useRef<THREE.Mesh>(null);
  const lanternsGroupRef = useRef<THREE.Group>(null);

  // Generate 40 floating flower lanterns (hoa đăng)
  const floatingLanterns: FloatingLanternData[] = useMemo(() => {
    const list: FloatingLanternData[] = [];
    const count = 42;

    for (let i = 0; i < count; i++) {
      const p1 = pseudoRandom(i * 5 + 1);
      const p2 = pseudoRandom(i * 5 + 2);
      const p3 = pseudoRandom(i * 5 + 3);
      const p4 = pseudoRandom(i * 5 + 4);

      // Spread along the river width and depth
      const x = (p1 - 0.5) * 8.5;
      const y = -1.5 + (p2 - 0.5) * 0.15;
      const z = -0.5 - p3 * 9.5;
      const speedZ = 0.002 + p4 * 0.005;
      const phase = p1 * Math.PI * 2;
      const color = LANTERN_PALETTE[Math.floor(p2 * LANTERN_PALETTE.length)];
      const scale = 0.6 + p3 * 0.5;

      list.push({ x, y, z, speedZ, phase, color, scale });
    }

    return list;
  }, []);

  // Shared reusable materials
  const candleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fff7eb",
        emissive: "#fce7c8",
        emissiveIntensity: 2.2,
        roughness: 0.1,
      }),
    []
  );

  const moonMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#fffdf2",
      }),
    []
  );

  const moonHaloMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#fce7c8",
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    []
  );

  const riverMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#050712",
        metalness: 0.9,
        roughness: 0.15,
        transparent: true,
        opacity: 0.95,
      }),
    []
  );

  useFrame(() => {
    if (!rootGroupRef.current) return;

    const riverOpacity = lanternSceneState.riverOpacity;
    if (riverOpacity <= 0.005) {
      rootGroupRef.current.visible = false;
      return;
    }
    rootGroupRef.current.visible = true;

    const time = performance.now() * 0.001;

    // 1. Moon & Ambient lighting
    if (moonLightRef.current) {
      moonLightRef.current.intensity = lanternSceneState.moonIntensity * 0.85;
    }
    if (moonMeshRef.current) {
      const scale = 1 + Math.sin(time * 0.3) * 0.02;
      moonMeshRef.current.scale.set(scale, scale, scale);
    }

    // 2. Water surface gentle ripple animation
    if (riverMeshRef.current) {
      const mat = riverMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.min(riverOpacity * 0.95, 0.95);
      riverMeshRef.current.position.y =
        -1.6 + Math.sin(time * 0.8) * 0.02;
    }

    // 3. Floating Hoa Đăng (River Lanterns) bobbing and drifting
    if (lanternsGroupRef.current) {
      lanternsGroupRef.current.children.forEach((child, index) => {
        const data = floatingLanterns[index];
        if (!data) return;

        // Gentle river current drift towards the viewer
        child.position.z += data.speedZ * riverOpacity;
        if (child.position.z > 2.5) {
          child.position.z = -10;
        }

        // River water bobbing
        child.position.y =
          data.y + Math.sin(time * 1.6 + data.phase) * 0.035;
        child.rotation.y = Math.sin(time * 0.6 + data.phase) * 0.15;
        child.rotation.z = Math.sin(time * 1.2 + data.phase) * 0.04;
      });
    }
  });

  return (
    <group ref={rootGroupRef} visible={false}>
      {/* 1. Mid-Autumn Full Moon (Vầng Trăng Rằm) */}
      <group position={[2.8, 2.6, -7]}>
        <mesh ref={moonMeshRef}>
          <circleGeometry args={[1.1, 32]} />
          <primitive object={moonMaterial} attach="material" />
        </mesh>
        {/* Atmospheric Moon Glow Halo */}
        <mesh scale={[1.45, 1.45, 1.45]}>
          <circleGeometry args={[1.1, 32]} />
          <primitive object={moonHaloMaterial} attach="material" />
        </mesh>
        {/* Soft moonlight beam cast across the river */}
        <directionalLight
          ref={moonLightRef}
          position={[-1, 2, 3]}
          color="#fff9ea"
          intensity={0}
        />
      </group>

      {/* 2. Reflective Dark River Water Surface */}
      <mesh
        ref={riverMeshRef}
        rotation={[-Math.PI / 2.15, 0, 0]}
        position={[0, -1.6, -2]}
      >
        <planeGeometry args={[26, 26, 32, 32]} />
        <primitive object={riverMaterial} attach="material" />
      </mesh>

      {/* 3. Floating Flower Lanterns (Hoa Đăng Trôi Sông) */}
      <group ref={lanternsGroupRef}>
        {floatingLanterns.map((data, index) => (
          <group
            key={index}
            position={[data.x, data.y, data.z]}
            scale={[data.scale, data.scale, data.scale]}
          >
            {/* Lotus Petal Outer Base */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.18, 0.08, 0.07, 8]} />
              <meshStandardMaterial
                color={data.color}
                emissive={data.color}
                emissiveIntensity={0.35}
                roughness={0.4}
              />
            </mesh>

            {/* Inner Floating Candle Core */}
            <mesh position={[0, 0.06, 0]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <primitive object={candleMaterial} attach="material" />
            </mesh>

            {/* Subtle local water glow underneath */}
            <pointLight
              color={data.color}
              intensity={0.25}
              distance={1.6}
              decay={2}
              position={[0, 0.05, 0]}
            />
          </group>
        ))}
      </group>
    </group>
  );
}
