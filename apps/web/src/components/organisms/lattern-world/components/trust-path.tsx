import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshBasicMaterial,
  TubeGeometry,
  Vector3,
} from "three";

import {
  pathIntentOffset,
  pathLabelOpacity,
  pathRejectionLabelOpacity,
} from "@/libs/cinematic/path-visibility";
import {
  clamp,
  mapProgress,
  smoothstep,
  windowProgress,
} from "@/libs/cinematic/progress";
import { cinematicState } from "@/libs/cinematic/runtime";

import { WORLD_LABEL_STYLE } from "../constants/network";
import type { WorldSettings } from "../types";

const TRUSTED_POINTS = [
  [-2.7, 0, 0],
  [-1.75, 0.25, 0],
  [-0.65, 0.05, 0],
  [0.5, 0.4, 0],
  [1.7, 0.15, 0],
  [2.8, 0.4, 0],
  [3.8, 0.1, 0],
];
const STEPS = [
  "USER",
  "INTENT",
  "LATTERN",
  "TRUSTED AGENT",
  "WALLET ACTION",
  "MONAD",
  "CONFIRMED",
];
const REJECTIONS = [
  "Unverified agent",
  "Poor execution history",
  "Unknown reputation",
];
const PATH_SEGMENTS = 120;

export function TrustPath({ mobile }: WorldSettings) {
  const group = useRef<Group>(null);
  const selected = useRef<Mesh>(null);
  const rejected = useRef<(Mesh | null)[]>([]);
  const rejectedNodes = useRef<(Mesh | null)[]>([]);
  const nodes = useRef<(Mesh | null)[]>([]);
  const pulse = useRef<Mesh>(null);
  const confirmation = useRef<Mesh>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const rejectionLabels = useRef<(HTMLDivElement | null)[]>([]);
  const intent = useRef<HTMLDivElement>(null);
  const path = useMemo(
    () =>
      new CatmullRomCurve3(
        TRUSTED_POINTS.map((point) => new Vector3(...point))
      ),
    []
  );
  const geometry = useMemo(
    () => new TubeGeometry(path, PATH_SEGMENTS, 0.017, 6, false),
    [path]
  );
  const alternatives = useMemo(
    () =>
      [1.45, -1.35, 2.55].map((height) => {
        const curve = new CatmullRomCurve3([
          new Vector3(-2.7, 0, 0),
          new Vector3(-0.8, height, -0.25),
          new Vector3(1.6, height * 0.85, -0.3),
          new Vector3(3.8, 0.1, 0),
        ]);
        return {
          geometry: new TubeGeometry(curve, 80, 0.008, 5, false),
          height,
        };
      }),
    []
  );

  useEffect(
    () => () => {
      geometry.dispose();
      alternatives.forEach((alternative) => alternative.geometry.dispose());
    },
    [geometry, alternatives]
  );

  useFrame(() => {
    const s = cinematicState;
    const visibility = windowProgress(0.59, 0.83, s.progress, 0.016);
    const evaluating = mapProgress(0.62, 0.705, s.progress);
    if (group.current) {
      group.current.visible = visibility > 0.001;
      group.current.scale.setScalar(mobile ? 0.6 : 1);
      group.current.position.x = mobile ? -0.2 : 1.1;
      group.current.position.y = mobile ? 1.9 : -0.25;
    }
    if (selected.current) {
      const material = selected.current.material as MeshBasicMaterial;
      material.opacity = visibility * (0.16 + smoothstep(evaluating) * 0.84);
      geometry.setDrawRange(
        0,
        Math.floor((0.08 + s.path * 0.92) * PATH_SEGMENTS) * 36
      );
    }
    rejected.current.forEach((mesh, i) => {
      if (!mesh) return;
      // One envelope drives the branch, its node and its label together.
      const reveal = visibility * pathRejectionLabelOpacity(i, evaluating);
      (mesh.material as MeshBasicMaterial).opacity = reveal * 0.65;
      const rejectedNode = rejectedNodes.current[i];
      if (rejectedNode)
        (rejectedNode.material as MeshBasicMaterial).opacity = reveal;
      if (rejectionLabels.current[i])
        rejectionLabels.current[i]!.style.opacity = String(reveal);
    });
    nodes.current.forEach((mesh, i) => {
      if (!mesh) return;
      const complete = smoothstep(clamp((s.execution - i / 7) * 15));
      (mesh.material as MeshBasicMaterial).opacity =
        visibility * (0.28 + complete * 0.72);
      mesh.scale.setScalar(1 + complete * 0.5);
      if (labels.current[i])
        labels.current[i]!.style.opacity = String(
          visibility * pathLabelOpacity(s.progress, complete)
        );
    });
    if (pulse.current) {
      pulse.current.visible = s.execution > 0.005 && s.execution < 0.995;
      pulse.current.position.copy(path.getPoint(s.execution));
    }
    if (confirmation.current) {
      const burst = mapProgress(0.79, 0.827, s.progress);
      confirmation.current.scale.setScalar(0.1 + burst * 12);
      (confirmation.current.material as MeshBasicMaterial).opacity =
        Math.sin(burst * Math.PI) * 0.8;
    }
    if (intent.current) {
      intent.current.style.opacity = String(visibility);
      intent.current.style.transform = `translateY(${pathIntentOffset(evaluating, mobile ? 28 : 48)}px)`;
    }
  });

  return (
    <group ref={group} position={[1.1, -0.25, -2]}>
      <mesh ref={selected} geometry={geometry}>
        <meshBasicMaterial
          color="#ffd296"
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>
      {alternatives.map((alternative, i) => (
        <group key={alternative.height}>
          <mesh
            ref={(node) => {
              rejected.current[i] = node;
            }}
            geometry={alternative.geometry}
          >
            <meshBasicMaterial color="#b57750" transparent opacity={0} />
          </mesh>
          <mesh
            ref={(node) => {
              rejectedNodes.current[i] = node;
            }}
            position={[-0.8, alternative.height, -0.25]}
          >
            <icosahedronGeometry args={[0.095, 0]} />
            <meshBasicMaterial
              color="#75513c"
              wireframe
              transparent
              opacity={0}
            />
          </mesh>
          {!mobile && (
            <Html
              position={[0.2, alternative.height + 0.2, -0.3]}
              center
              zIndexRange={[4, 0]}
            >
              <div
                ref={(node) => {
                  rejectionLabels.current[i] = node;
                }}
                className="px-3 py-1.5"
                style={{
                  ...WORLD_LABEL_STYLE,
                  color: "#f1c4a4",
                  fontSize: "12px",
                  fontWeight: 500,
                  letterSpacing: "0.03em",
                  transform: "translateY(-14px)",
                  opacity: 0,
                }}
              >
                × {REJECTIONS[i]}
              </div>
            </Html>
          )}
        </group>
      ))}
      {TRUSTED_POINTS.map((point, i) => (
        <group key={STEPS[i]} position={point as [number, number, number]}>
          <mesh
            ref={(node) => {
              nodes.current[i] = node;
            }}
          >
            <icosahedronGeometry args={[0.075, 1]} />
            <meshBasicMaterial
              color={i === 5 ? "#b399e6" : "#ffd08b"}
              transparent
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[0, 0, 0.5]}>
            <torusGeometry args={[0.14, 0.005, 6, 40]} />
            <meshBasicMaterial color="#d5a160" transparent opacity={0.5} />
          </mesh>
          <Html
            position={[0, i % 2 ? -0.48 : 0.48, 0]}
            center
            zIndexRange={[4, 0]}
          >
            <div
              ref={(node) => {
                labels.current[i] = node;
              }}
              className="bg-stone-950/95 px-2 py-1"
              style={{
                ...WORLD_LABEL_STYLE,
                color: "#fff0d6",
                fontSize: mobile ? "8px" : "11px",
                fontWeight: 500,
                letterSpacing: "0.03em",
                opacity: 0,
              }}
            >
              {STEPS[i]}
            </div>
          </Html>
        </group>
      ))}
      <mesh ref={pulse}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshBasicMaterial color="#fff0d6" toneMapped={false} />
      </mesh>
      <mesh ref={confirmation} position={[3.8, 0.1, 0]}>
        <torusGeometry args={[1, 0.012, 6, 100]} />
        <meshBasicMaterial
          color="#ffd79b"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <Html position={[0.6, -1.05, 0]} center zIndexRange={[4, 0]}>
        <div
          ref={intent}
          className="border-b border-amber-200/40 bg-stone-950/95 px-3 py-2"
          style={{
            ...WORLD_LABEL_STYLE,
            color: "#fff0d6",
            fontSize: mobile ? "10px" : "12px",
            letterSpacing: "0.03em",
            opacity: 0,
            transform: `translateY(${mobile ? 28 : 48}px)`,
          }}
        >
          <span className="mr-4 text-amber-200">USER INTENT</span> SWAP MON →
          USDC
        </div>
      </Html>
    </group>
  );
}
