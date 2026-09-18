import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshBasicMaterial, Vector3 } from "three";

import { cinematicState } from "@/libs/cinematic/runtime";
import {
  infrastructureLayerReveal,
  infrastructureTransfer,
} from "@/libs/cinematic/infrastructure";

import { INFRASTRUCTURE, WORLD_LABEL_STYLE } from "../constants/network";
import type { WorldSettings } from "../types";

const DEPTH = new Vector3(0, 0, -2.4);
const SPACING = 0.85;
const DETAILS = [
  "Discover an agent",
  "Verify its identity",
  "Evaluate its track record",
  "Route a trusted execution",
  "Settle onchain",
];

export function Infrastructure({ mobile, reducedMotion }: WorldSettings) {
  const group = useRef<Group>(null);
  const layers = useRef<(Group | null)[]>([]);
  const outlines = useRef<(MeshBasicMaterial | null)[]>([]);
  const nodes = useRef<(MeshBasicMaterial | null)[]>([]);
  const tracks = useRef<(MeshBasicMaterial | null)[]>([]);
  const links = useRef<(Mesh | null)[]>([]);
  const pulses = useRef<(Mesh | null)[]>([]);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const heading = useRef<HTMLDivElement>(null);

  useFrame(({ camera, viewport }) => {
    const s = cinematicState;
    const visible = s.infrastructure > 0.001;
    if (group.current) group.current.visible = visible;
    // Html lives outside the WebGL scene, so hide it explicitly at chapter exits.
    if (heading.current)
      heading.current.style.opacity = String(s.infrastructure);
    labels.current.forEach((label, i) => {
      if (!label) return;
      const reveal = infrastructureLayerReveal(i, s.progress);
      label.style.opacity = String(s.infrastructure * reveal);
      label.style.transform = `translateY(${reducedMotion ? 0 : (1 - reveal) * 8}px)`;
    });
    if (!visible || !group.current) return;

    const bounds = viewport.getCurrentViewport(camera, DEPTH);
    const scale = mobile ? 0.62 : Math.min(1.2, bounds.height / 7.5);
    group.current.scale.setScalar(scale);
    group.current.position.set(
      mobile ? -0.35 : bounds.width * 0.18,
      mobile ? 2 : 0,
      -2.4
    );
    // A facing-camera stack keeps the spine, arrows and labels aligned as the
    // cinematic camera moves. No scattered particles cross the reading area.
    group.current.quaternion.copy(camera.quaternion);

    INFRASTRUCTURE.forEach((_, i) => {
      const reveal = infrastructureLayerReveal(i, s.progress);
      const alpha = s.infrastructure * reveal;
      const layer = layers.current[i];
      if (layer)
        layer.position.y =
          1.7 - i * SPACING - (reducedMotion ? 0 : (1 - reveal) * 0.1);
      if (outlines.current[i]) outlines.current[i]!.opacity = alpha * 0.8;
      if (nodes.current[i]) nodes.current[i]!.opacity = alpha;
      if (tracks.current[i]) tracks.current[i]!.opacity = alpha * 0.16;
      const link = links.current[i];
      const pulse = pulses.current[i];
      if (!link || !pulse) return;
      const transfer = infrastructureTransfer(i, s.progress);
      const length = (SPACING - 0.22) * transfer;
      link.scale.y = Math.max(0.0001, length);
      link.position.y = 1.7 - i * SPACING - 0.11 - length / 2;
      (link.material as MeshBasicMaterial).opacity = alpha * 0.75;
      pulse.position.y = 1.7 - i * SPACING - 0.11 - length;
      pulse.visible = !reducedMotion && transfer > 0 && transfer < 1;
      (pulse.material as MeshBasicMaterial).opacity = alpha;
    });
  });

  return (
    <group ref={group} visible={false}>
      <Html position={[-1.25, 2.3, 0]} zIndexRange={[4, 0]}>
        <div
          ref={heading}
          style={{
            ...WORLD_LABEL_STYLE,
            opacity: 0,
            fontSize: mobile ? "8px" : "9px",
            color: "#c7b69f",
          }}
        >
          TRUST INFRASTRUCTURE <span style={{ color: "#e7b26b" }}>↓</span>
          {!mobile && (
            <small style={{ display: "block", fontSize: "8px", opacity: 0.65 }}>
              ILLUSTRATIVE FLOW · SCROLL TO EXPLORE
            </small>
          )}
        </div>
      </Html>
      {INFRASTRUCTURE.map((layer, i) => {
        const color = i === 4 ? "#c2a5f5" : "#e7b26b";
        return (
          <group key={layer}>
            <group
              ref={(node) => {
                layers.current[i] = node;
              }}
              position={[0, 1.7 - i * SPACING, 0]}
            >
              <mesh position={[-0.55, 0, 0]} scale={[1.35, 0.32, 1]}>
                <ringGeometry args={[0.68, 0.695, 4]} />
                <meshBasicMaterial
                  ref={(node) => {
                    outlines.current[i] = node;
                  }}
                  color={color}
                  transparent
                  opacity={0}
                  depthWrite={false}
                  toneMapped={false}
                  fog={false}
                />
              </mesh>
              <mesh position={[-0.55, 0, 0.02]}>
                <circleGeometry args={[i === 4 ? 0.11 : 0.08, 6]} />
                <meshBasicMaterial
                  ref={(node) => {
                    nodes.current[i] = node;
                  }}
                  color={color}
                  transparent
                  opacity={0}
                  depthWrite={false}
                  toneMapped={false}
                  fog={false}
                />
              </mesh>
              <Html position={[0.65, 0.14, 0]} zIndexRange={[4, 0]}>
                <div
                  ref={(node) => {
                    labels.current[i] = node;
                  }}
                  style={{
                    ...WORLD_LABEL_STYLE,
                    opacity: 0,
                    color: i === 4 ? "#dbc8ff" : "#f2dfc5",
                    fontSize: mobile ? "9px" : "12px",
                    letterSpacing: ".06em",
                    textShadow: "0 2px 6px #080806",
                  }}
                >
                  <span style={{ color, marginRight: "10px", fontSize: "9px" }}>
                    0{i + 1}
                  </span>
                  {layer.toUpperCase()}
                  {!mobile && (
                    <span
                      style={{
                        display: "block",
                        color: "#c7b69f",
                        fontSize: "10px",
                        letterSpacing: ".02em",
                        marginTop: "3px",
                      }}
                    >
                      {DETAILS[i]}
                    </span>
                  )}
                </div>
              </Html>
            </group>
            {i < INFRASTRUCTURE.length - 1 && (
              <>
                <mesh position={[-0.55, 1.7 - i * SPACING - SPACING / 2, 0]}>
                  <planeGeometry args={[0.012, SPACING - 0.22]} />
                  <meshBasicMaterial
                    ref={(node) => {
                      tracks.current[i] = node;
                    }}
                    color={color}
                    transparent
                    opacity={0}
                    depthWrite={false}
                    fog={false}
                  />
                </mesh>
                <mesh
                  ref={(node) => {
                    links.current[i] = node;
                  }}
                  position={[-0.55, 0, 0.01]}
                >
                  <planeGeometry args={[0.018, 1]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0}
                    depthWrite={false}
                    toneMapped={false}
                    fog={false}
                  />
                </mesh>
                <mesh
                  ref={(node) => {
                    pulses.current[i] = node;
                  }}
                  position={[-0.55, 0, 0.03]}
                  rotation={[0, 0, Math.PI]}
                  visible={false}
                >
                  <circleGeometry args={[0.055, 3, Math.PI / 2]} />
                  <meshBasicMaterial
                    color="#fff1db"
                    transparent
                    opacity={0}
                    depthWrite={false}
                    toneMapped={false}
                    fog={false}
                  />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
