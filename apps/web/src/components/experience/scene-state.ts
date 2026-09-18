import { ANIMATION_CONSTANTS } from "@/constants/animation";

export interface LanternSceneState {
  // Lantern Transform
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  scale: number;
  lanternOpacity: number;

  // Illumination Values
  lightIntensity: number;
  glowIntensity: number;
  emissiveIntensity: number;

  // Particles / Atmosphere
  particleEnergy: number;

  // Network system
  networkProgress: number;
  networkEnergy: number;

  // Retained for the optional river scene component.
  riverOpacity: number;
  moonIntensity: number;

  // Camera Target Transform
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  cameraFov: number;

  // Meta Chapter Progress
  chapterProgress: number;
  activeChapter: number;
}

export const initialLanternSceneState: LanternSceneState = {
  rotationX: 0,
  rotationY: ANIMATION_CONSTANTS.lantern.baseRotationY,
  rotationZ: 0,
  // Starts on the RIGHT side for Section 1
  positionX: 1.7,
  positionY: 0,
  positionZ: 0,
  scale: ANIMATION_CONSTANTS.lantern.baseScale,
  lanternOpacity: 1,

  lightIntensity: 0.2,
  glowIntensity: 0.2,
  emissiveIntensity: 0.35,

  particleEnergy: 0.2,
  networkProgress: 0,
  networkEnergy: 0,
  riverOpacity: 0,
  moonIntensity: 0,

  cameraX: 0,
  cameraY: ANIMATION_CONSTANTS.camera.initialPosition[1],
  cameraZ: ANIMATION_CONSTANTS.camera.initialPosition[2],
  cameraFov: ANIMATION_CONSTANTS.camera.fov,

  chapterProgress: 0,
  activeChapter: 1,
};

/**
 * Shared mutable reference object.
 * GSAP directly tweens these numerical properties without causing React re-renders.
 * Three.js useFrame hooks read from this object on every animation frame.
 */
export const lanternSceneState: LanternSceneState = {
  ...initialLanternSceneState,
};
