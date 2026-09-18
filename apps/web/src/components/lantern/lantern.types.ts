export interface LanternProps {
  readonly scale?: number;
  readonly position?: readonly [number, number, number];
}

export interface LanternMaterialProps {
  readonly lightIntensity: number;
  readonly glowIntensity: number;
  readonly emissiveIntensity: number;
}
