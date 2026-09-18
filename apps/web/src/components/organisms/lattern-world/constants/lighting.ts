import { cinematicState } from "@/libs/cinematic/runtime";
import { clamp, smoothstep } from "@/libs/cinematic/progress";

/** The same angular aperture as the lantern's real spotlight, in world space. */
export function illuminationAt(x: number, y: number, z: number) {
  const s = cinematicState;
  const dx = x - s.lanternX;
  const dy = y - s.lanternY;
  const dz = z - s.lanternZ;
  const bx = s.beamX - s.lanternX;
  const by = s.beamY - s.lanternY;
  const bz = s.beamZ - s.lanternZ;
  const lengths = Math.hypot(dx, dy, dz) * Math.hypot(bx, by, bz);
  const alignment = (dx * bx + dy * by + dz * bz) / Math.max(lengths, 0.001);
  return smoothstep(clamp((alignment - 0.78) / 0.2)) * s.ignition;
}
