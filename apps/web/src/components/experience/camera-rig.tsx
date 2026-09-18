"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lanternSceneState } from "./scene-state";

export function CameraRig() {
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalize mouse to [-1, 1]
      const nx = (event.clientX / window.innerWidth) * 2 - 1;
      const ny = -(event.clientY / window.innerHeight) * 2 + 1;
      mouseRef.current.targetX = nx * 0.25;
      mouseRef.current.targetY = ny * 0.15;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useFrame((state, delta) => {
    // Smooth lerp mouse parallax
    mouseRef.current.x = THREE.MathUtils.damp(
      mouseRef.current.x,
      mouseRef.current.targetX,
      2.5,
      delta
    );
    mouseRef.current.y = THREE.MathUtils.damp(
      mouseRef.current.y,
      mouseRef.current.targetY,
      2.5,
      delta
    );

    // Target camera coordinates from GSAP scroll state + mouse parallax
    const targetX = lanternSceneState.cameraX + mouseRef.current.x;
    const targetY = lanternSceneState.cameraY + mouseRef.current.y;
    const targetZ = lanternSceneState.cameraZ;

    state.camera.position.x = THREE.MathUtils.damp(
      state.camera.position.x,
      targetX,
      4,
      delta
    );
    state.camera.position.y = THREE.MathUtils.damp(
      state.camera.position.y,
      targetY,
      4,
      delta
    );
    state.camera.position.z = THREE.MathUtils.damp(
      state.camera.position.z,
      targetZ,
      4,
      delta
    );
    const camera = state.camera as THREE.PerspectiveCamera;
    camera.fov = THREE.MathUtils.damp(
      camera.fov,
      lanternSceneState.cameraFov,
      4,
      delta
    );
    camera.updateProjectionMatrix();

    // Look slightly towards lantern center
    state.camera.lookAt(0, 0.45, 0);
  });

  return null;
}
