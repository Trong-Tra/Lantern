"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lanternSceneState } from "@/components/experience/scene-state";
import { LanternParticles } from "./lantern-particles";
import { createLotusPetal } from "./lotus-geometry";
import type { LanternProps } from "./lantern.types";

const layers = [
  {
    count: 7,
    offset: 0,
    height: 1.95,
    width: 0.36,
    bulge: 0.29,
    tipRadius: -0.08,
  },
  {
    count: 8,
    offset: Math.PI / 8,
    height: 1.56,
    width: 0.43,
    bulge: 0.51,
    tipRadius: 0.16,
  },
  {
    count: 9,
    offset: 0.12,
    height: 1.14,
    width: 0.42,
    bulge: 0.57,
    tipRadius: 0.43,
  },
  {
    count: 7,
    offset: 0.25,
    height: 0.19,
    width: 0.23,
    bulge: 0.28,
    tipRadius: 0.52,
  },
];

export function Lantern({
  scale = 1,
  position = [0, 0, 0],
}: Readonly<LanternProps>) {
  const root = useRef<THREE.Group>(null);
  const petal =
    useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const tassel = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const assets = useMemo(
    () => ({
      petals: layers.map(createLotusPetal),
      silk: new THREE.MeshStandardMaterial({
        color: "#fff3da",
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.78,
        metalness: 0.02,
        emissive: "#f6b45e",
        emissiveIntensity: 0.3,
      }),
      brass: new THREE.MeshStandardMaterial({
        color: "#926133",
        metalness: 0.72,
        roughness: 0.32,
      }),
      ribs: new THREE.MeshStandardMaterial({
        color: "#bd9255",
        metalness: 0.3,
        roughness: 0.63,
      }),
      thread: new THREE.MeshStandardMaterial({
        color: "#b88843",
        metalness: 0.18,
        roughness: 0.75,
      }),
    }),
    []
  );

  useEffect(
    () => () => {
      assets.petals.forEach(({ surface, ribs }) => {
        surface.dispose();
        ribs.forEach((rib) => rib.dispose());
      });
      assets.silk.dispose();
      assets.brass.dispose();
      assets.ribs.dispose();
      assets.thread.dispose();
    },
    [assets]
  );

  useFrame(({ clock }) => {
    if (!root.current) return;
    const s = lanternSceneState;
    const time = clock.getElapsedTime();
    root.current.visible = s.lanternOpacity > 0.01;
    root.current.position.set(
      position[0] + s.positionX,
      position[1] + s.positionY + Math.sin(time * 0.7) * 0.018,
      position[2] + s.positionZ
    );
    root.current.rotation.set(
      s.rotationX,
      s.rotationY,
      s.rotationZ + Math.sin(time * 0.5) * 0.01
    );
    root.current.scale.setScalar(scale * s.scale * s.lanternOpacity);
    // Preserve the silk shading at peak brightness instead of washing out the petals.
    if (petal.current)
      petal.current.material.emissiveIntensity =
        0.08 + Math.min(s.emissiveIntensity, 1.5) * 0.38;
    if (light.current)
      light.current.intensity = s.lightIntensity * s.lanternOpacity;
    if (tassel.current)
      tassel.current.rotation.z = Math.sin(time * 0.9) * 0.025;
  });

  return (
    <group ref={root} position={[...position]}>
      <pointLight
        position={[2.5, 2.4, 3]}
        color="#ffe4bb"
        intensity={5}
        distance={7}
        decay={2}
      />
      <pointLight
        position={[-2, 1, -2]}
        color="#d8c7ad"
        intensity={3}
        distance={6}
        decay={2}
      />
      <mesh position={[0, 2.65, 0]} material={assets.brass}>
        <cylinderGeometry args={[0.006, 0.006, 2.4, 8]} />
      </mesh>
      <mesh position={[0, 1.46, 0]} material={assets.brass}>
        <torusGeometry args={[0.064, 0.013, 12, 32]} />
      </mesh>
      <mesh position={[0, 1.34, 0]} material={assets.brass}>
        <coneGeometry args={[0.17, 0.18, 48]} />
      </mesh>
      <mesh position={[0, 1.25, 0]} material={assets.brass}>
        <cylinderGeometry args={[0.18, 0.21, 0.035, 48]} />
      </mesh>
      {layers.map((layer, layerIndex) => (
        <group key={layerIndex}>
          {Array.from({ length: layer.count }, (_, i) => (
            <group
              key={i}
              rotation={[0, (i / layer.count) * Math.PI * 2 + layer.offset, 0]}
            >
              <mesh
                ref={layerIndex === 0 && i === 0 ? petal : undefined}
                geometry={assets.petals[layerIndex].surface}
                material={assets.silk}
              />
              {assets.petals[layerIndex].ribs.map((geometry, ribIndex) => (
                <mesh
                  key={ribIndex}
                  geometry={geometry}
                  material={assets.ribs}
                />
              ))}
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.25, 0]} scale={[0.75, 2.4, 0.75]}>
        <sphereGeometry args={[0.16, 24, 32]} />
        <meshStandardMaterial
          color="#fff3cf"
          emissive="#ffc66c"
          emissiveIntensity={1.6}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[0, 0.15, 0]}
        color="#ffe0a5"
        distance={10}
        decay={2}
      />
      <mesh position={[0, -0.7, 0]} material={assets.brass}>
        <cylinderGeometry args={[0.19, 0.14, 0.13, 48]} />
      </mesh>
      {[-0.65, -0.75].map((y) => (
        <mesh
          key={y}
          position={[0, y, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={assets.brass}
        >
          <torusGeometry args={[0.18, 0.016, 10, 48]} />
        </mesh>
      ))}
      <group ref={tassel} position={[0, -0.78, 0]}>
        <mesh position={[0, -0.11, 0]} material={assets.thread}>
          <cylinderGeometry args={[0.011, 0.011, 0.22, 8]} />
        </mesh>
        <mesh position={[0, -0.23, 0]} material={assets.brass}>
          <sphereGeometry args={[0.065, 24, 24]} />
        </mesh>
        <mesh position={[0, -0.32, 0]} material={assets.brass}>
          <cylinderGeometry args={[0.048, 0.061, 0.07, 24]} />
        </mesh>
        {Array.from({ length: 36 }, (_, i) => {
          const angle = (i / 36) * Math.PI * 2;
          const length = 0.69 + Math.sin(i * 4.7) * 0.025;
          return (
            <mesh
              key={i}
              position={[
                Math.cos(angle) * 0.046,
                -0.35 - length / 2,
                Math.sin(angle) * 0.046,
              ]}
              rotation={[Math.sin(angle) * 0.022, 0, -Math.cos(angle) * 0.022]}
              material={assets.thread}
            >
              <cylinderGeometry args={[0.003, 0.0045, length, 5]} />
            </mesh>
          );
        })}
      </group>
      <LanternParticles count={24} />
    </group>
  );
}
