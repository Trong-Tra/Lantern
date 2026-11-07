"use client";

import { useEffect, useMemo, useRef } from "react";

import { useFrame } from "@react-three/fiber";
import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  SpotLight,
  Vector3,
} from "three";

import { cinematicState } from "@/libs/cinematic/runtime";

import { createLanternGeometry } from "./geometry";
import { createBeamMaterial, createHaloMaterial } from "./light-materials";

export function Lantern() {
  const group = useRef<Group>(null);
  const tassel = useRef<Group>(null);
  const halo = useRef<Mesh>(null);
  const beam = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  const spotlight = useRef<SpotLight>(null);
  const flame = useRef<Mesh>(null);
  const resources = useMemo(() => {
    const geometries = createLanternGeometry();
    const silk = new MeshStandardMaterial({
      color: "#e5c393",
      map: geometries.fabric,
      roughness: 0.92,
      emissive: "#ffc075",
      emissiveMap: geometries.transmission,
      emissiveIntensity: 0,
      metalness: 0,
    });
    const brass = new MeshStandardMaterial({
      color: "#80603a",
      metalness: 0.76,
      roughness: 0.39,
      emissive: "#a06023",
      emissiveIntensity: 0,
    });
    const ribs = new MeshStandardMaterial({
      color: "#39241a",
      metalness: 0.27,
      roughness: 0.62,
    });
    const thread = new MeshStandardMaterial({
      color: "#a67944",
      metalness: 0.12,
      roughness: 0.85,
    });
    const flameMaterial = new MeshBasicMaterial({
      color: "#ffe4a4",
      transparent: true,
      opacity: 0,
      toneMapped: false,
    });
    const beamGeometry = new CylinderGeometry(0.07, 2.7, 5, 48, 1, true);
    beamGeometry.translate(0, -2.5, 0);
    beamGeometry.rotateX(-Math.PI / 2);
    return {
      geometries,
      silk,
      brass,
      ribs,
      thread,
      flameMaterial,
      haloMaterial: createHaloMaterial(),
      beamMaterial: createBeamMaterial(),
      haloGeometry: new PlaneGeometry(3.6, 4.1),
      beamGeometry,
      sphere: new SphereGeometry(1, 16, 12),
      target: new Object3D(),
      origin: new Vector3(),
    };
  }, []);
  // Three.js owns these mutable GPU resources; React only owns their lifetime.
  const frameResources = useRef(resources);

  useEffect(
    () => () => {
      Object.values(resources.geometries).forEach((resource) =>
        resource.dispose()
      );
      [
        resources.silk,
        resources.brass,
        resources.ribs,
        resources.thread,
        resources.flameMaterial,
        resources.haloMaterial,
        resources.beamMaterial,
        resources.haloGeometry,
        resources.beamGeometry,
        resources.sphere,
      ].forEach((resource) => resource.dispose());
    },
    [resources]
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const current = frameResources.current;
    const s = cinematicState;
    const time = s.reducedMotion ? 0 : clock.elapsedTime;
    const breath = s.reducedMotion ? 1 : 1 + Math.sin(time * 1.7) * 0.018;
    const ignition = s.ignition * breath;
    // Keep the history and execution labels ahead of the decorative glow.
    const readingFocus = Math.max(
      s.reputation,
      s.executionFocus,
      s.infrastructureFocus,
      s.finaleFocus
    );
    const surfaceGlow = ignition * (1 - readingFocus * 0.45);
    const sway = Math.sin(time * 0.52) * 0.014;
    group.current.position.set(
      s.lanternX,
      s.lanternY + Math.sin(time * 0.65) * 0.017,
      s.lanternZ
    );
    group.current.scale.setScalar(s.lanternScale);
    group.current.rotation.set(sway * 0.6, s.lanternRotation, sway);
    current.silk.emissiveIntensity = surfaceGlow * 1.38;
    current.brass.emissiveIntensity = ignition * 0.075;
    current.flameMaterial.opacity = ignition * 0.9;
    current.haloMaterial.uniforms.uIgnition.value =
      ignition * (1 - readingFocus * 0.7);
    current.beamMaterial.uniforms.uIgnition.value =
      ignition * (1 - readingFocus * 0.6) * (1 - s.finaleFocus * 0.85);
    if (tassel.current) tassel.current.rotation.z = -sway * 1.9;
    if (flame.current) flame.current.scale.set(0.072, 0.15 * breath, 0.072);
    if (light.current)
      light.current.intensity =
        ignition *
        3.4 *
        (1 -
          Math.max(s.executionFocus, s.infrastructureFocus, s.finaleFocus) *
            0.5);
    if (halo.current) {
      halo.current.visible = ignition > 0.001;
      halo.current.position.copy(group.current.position);
    }
    current.origin.copy(group.current.position);
    current.target.position.set(s.beamX, s.beamY, s.beamZ);
    current.target.updateMatrixWorld();
    if (spotlight.current) {
      spotlight.current.position.copy(current.origin);
      spotlight.current.intensity = ignition * 32;
    }
    if (beam.current) {
      beam.current.visible = ignition > 0.001;
      beam.current.position.copy(current.origin);
      beam.current.lookAt(current.target.position);
      const distance = current.origin.distanceTo(current.target.position);
      beam.current.scale.set(distance / 5, distance / 5, distance / 5);
    }
  }, -1);

  return (
    <>
      <group ref={group} dispose={null}>
        {/* A brass, glass-sided beacon replaces the paper lantern silhouette. */}
        <mesh position={[0, -0.9, 0]} material={resources.brass}>
          <cylinderGeometry args={[0.61, 0.68, 0.16, 8]} />
        </mesh>
        <mesh position={[0, 0.72, 0]} material={resources.brass}>
          <cylinderGeometry args={[0.3, 0.65, 0.3, 8]} />
        </mesh>
        <mesh position={[0, 0.94, 0]} material={resources.brass}>
          <cylinderGeometry args={[0.13, 0.25, 0.16, 8]} />
        </mesh>
        <mesh position={[0, 1.22, 0]} material={resources.brass}>
          <torusGeometry args={[0.22, 0.035, 8, 32]} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.53, 0.57, 1.42, 8, 1, true]} />
          <meshStandardMaterial color="#d4a76b" transparent opacity={0.16} roughness={0.2} metalness={0.2} side={2} depthWrite={false} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return <mesh key={i} position={[Math.sin(angle) * 0.55, -0.05, Math.cos(angle) * 0.55]} material={resources.brass}>
            <cylinderGeometry args={[0.025, 0.025, 1.48, 6]} />
          </mesh>;
        })}
        {[-0.68, 0.55].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={resources.brass}>
          <torusGeometry args={[0.56, 0.025, 6, 8]} />
        </mesh>)}
        <mesh position={[0, -0.46, 0]} material={resources.brass}>
          <cylinderGeometry args={[0.16, 0.23, 0.12, 16]} />
        </mesh>
        <mesh
          ref={flame}
          geometry={resources.sphere}
          material={resources.flameMaterial}
          scale={[0.072, 0.15, 0.072]}
          position={[0, -0.13, 0]}
        />
        <pointLight
          ref={light}
          color="#ffbe78"
          intensity={0}
          position={[0, 0.05, 0.8]}
          distance={5.5}
          decay={2}
        />
      </group>
      <mesh
        ref={halo}
        geometry={resources.haloGeometry}
        material={resources.haloMaterial}
        renderOrder={2}
        dispose={null}
      />
      <mesh
        ref={beam}
        geometry={resources.beamGeometry}
        material={resources.beamMaterial}
        renderOrder={1}
        dispose={null}
      />
      <spotLight
        ref={spotlight}
        color="#ffd5a0"
        intensity={0}
        angle={0.55}
        penumbra={0.82}
        distance={15}
        decay={1.4}
        target={resources.target}
      />
      <primitive object={resources.target} />
    </>
  );
}
