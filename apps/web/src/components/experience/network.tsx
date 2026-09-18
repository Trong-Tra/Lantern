"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lanternSceneState } from "./scene-state";

const nodes = [
  [0, 0.2, -0.8], [-2.25, 1.25, -1.7], [2.25, 1.1, -1.6],
  [-2.8, -1.3, -2.2], [2.75, -1.2, -2.1], [0, -1.65, -2.7],
  [-0.9, 2.55, -3.1], [1.15, 2.45, -3.15],
] as const;

const edges = [[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[2,7],[1,3],[2,4],[3,5],[4,5],[6,7]] as const;

function Connection({ from, to }: { from: number; to: number }) {
  const lineRef = useRef<THREE.Mesh>(null);
  const { midpoint, length, rotation } = useMemo(() => {
    const start = new THREE.Vector3(...nodes[from]);
    const end = new THREE.Vector3(...nodes[to]);
    const direction = end.clone().sub(start);
    return {
      midpoint: start.clone().add(end).multiplyScalar(.5),
      length: direction.length(),
      rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    };
  }, [from, to]);
  useFrame(() => {
    if (!lineRef.current) return;
    const material = lineRef.current.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, Math.min(0.44, (lanternSceneState.networkProgress - 0.18) * 0.55));
  });
  return <mesh ref={lineRef} position={midpoint} quaternion={rotation}>
    <cylinderGeometry args={[0.009, 0.009, length, 6]} />
    <meshBasicMaterial color="#f6c77a" transparent opacity={0} />
  </mesh>;
}

function Signal({ edge, offset }: { edge: readonly [number, number]; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const strength = Math.max(0, lanternSceneState.networkEnergy - 0.15);
    ref.current.visible = strength > 0.02;
    const phase = (clock.getElapsedTime() * (0.18 + strength * 0.42) + offset) % 1;
    ref.current.position.lerpVectors(new THREE.Vector3(...nodes[edge[0]]), new THREE.Vector3(...nodes[edge[1]]), phase);
    ref.current.scale.setScalar(0.4 + strength * 0.7);
  });
  return <mesh ref={ref}><sphereGeometry args={[0.07, 12, 12]} /><meshBasicMaterial color="#fff4ce" /></mesh>;
}

export function Network() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = lanternSceneState.networkProgress;
    groupRef.current.visible = p > 0.01;
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.025;
    groupRef.current.scale.setScalar(0.55 + p * 0.45);
  });
  return <group ref={groupRef} visible={false}>
    {edges.map(([from, to]) => <Connection key={`${from}-${to}`} from={from} to={to} />)}
    {nodes.map((position, index) => <group key={index} position={position}>
      <mesh><sphereGeometry args={[index === 0 ? 0.22 : 0.14, 18, 18]} /><meshStandardMaterial color="#f2c77b" emissive="#f59e0b" emissiveIntensity={1.8} /></mesh>
      <mesh scale={[2.3,2.3,2.3]}><sphereGeometry args={[0.14, 16, 16]} /><meshBasicMaterial color="#f6bd65" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
    </group>)}
    {edges.slice(0, 7).map((edge, index) => <Signal key={index} edge={edge} offset={index / 7} />)}
  </group>;
}
