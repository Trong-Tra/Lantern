/**
 * Central animation constants for the LANTERN experience.
 * Avoids magic numbers in component logic.
 */
export const ANIMATION_CONSTANTS = {
  lantern: {
    baseRotationY: 0,
    chapter1MaxRotationY: Math.PI * 1.22, // ~220 deg
    chapter1EndRotationY: Math.PI * 1.5,  // ~270 deg
    minLightIntensity: 0.05,
    initialLightIntensity: 0.05,
    midLightIntensity: 0.8,
    maxChapter1LightIntensity: 3.2,
    baseScale: 1,
    minScale: 0.95,
    basePosition: [0, 0, 0] as const,
    elevatedPositionY: 0.35,
  },
  camera: {
    initialPosition: [0, 0.2, 6.2] as const,
    fov: 45,
    near: 0.1,
    far: 100,
  },
  colors: {
    void: "#050308",
    surface1: "#0b0714",
    incandescent: "#fff7eb",
    filament: "#fce7c8",
    filamentAged: "#e2d3b3",
    monad: "#836ef9",
    amber: "#f59e0b",
    brassDark: "#3a2e1d",
    brassMid: "#6a5732",
    brassLight: "#a6884d",
  },
  durations: {
    chapter1Height: "450vh",
  },
} as const;
