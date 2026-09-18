import type { ReactNode } from "react";

export interface WorldSettings {
  readonly reducedMotion: boolean;
  readonly mobile: boolean;
}

export interface SceneProps {
  readonly reducedMotion: boolean;
  readonly onReady?: () => void;
  readonly onUnavailable?: () => void;
}

export interface BoundaryProps {
  readonly children: ReactNode;
  readonly onUnavailable?: () => void;
}

export interface NetworkAgent {
  readonly id: string;
  readonly position: readonly [number, number, number];
  readonly verified: boolean;
  readonly reputation: number;
  readonly executions: number;
  readonly failures: number;
  readonly soul: boolean;
}
