import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial } from "three";

import { discoveryReveal } from "@/libs/cinematic/discovery";
import { mapProgress, smoothstep } from "@/libs/cinematic/progress";
import { cinematicState } from "@/libs/cinematic/runtime";

import { illuminationAt } from "../constants/lighting";
import { HISTORY, WORLD_LABEL_STYLE } from "../constants/network";
import type { WorldSettings } from "../types";

export function SoulCore({ mobile, reducedMotion }: WorldSettings) {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const shell = useRef<MeshBasicMaterial>(null);
  const rings = useRef<(Mesh | null)[]>([]);
  const historyRings = useRef<(Mesh | null)[]>([]);
  const history = useRef<(HTMLDivElement | null)[]>([]);
  const identity = useRef<HTMLDivElement>(null);
  const metadata = useRef<HTMLDivElement>(null);
  const halo = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const s = cinematicState;
    const visibility = s.soul;
    const opening = smoothstep(mapProgress(0.29, 0.35, s.progress));
    const earned = mapProgress(0.49, 0.58, s.progress);
    const time = reducedMotion ? 0 : clock.elapsedTime;
    const lit =
      0.2 + illuminationAt(mobile ? 0.4 : 1.55, mobile ? 1.55 : 0.1, -2) * 0.8;
    if (group.current) {
      group.current.visible = visibility > 0.001;
      group.current.scale.setScalar(mobile ? 0.76 : 1);
      group.current.position.set(mobile ? 0.4 : 1.55, mobile ? 1.55 : 0.1, -2);
    }
    if (shell.current)
      shell.current.opacity = visibility * (0.91 - opening * 0.84);
    if (core.current) {
      core.current.scale.setScalar(0.12 + opening * 0.86);
      core.current.rotation.set(time * 0.05, s.progress * 8, 0.2);
      (core.current.material as MeshBasicMaterial).opacity =
        visibility * opening * lit;
    }
    if (halo.current) {
      halo.current.scale.setScalar(1.05 + Math.sin(time * 1.3) * 0.025);
      (halo.current.material as MeshBasicMaterial).opacity =
        opening * visibility * lit * 0.085;
    }
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const layer = smoothstep(
        mapProgress(0.31 + i * 0.014, 0.34 + i * 0.014, s.progress)
      );
      ring.rotation.z = s.progress * (i % 2 ? -3 : 3) + i * 0.7;
      (ring.material as MeshBasicMaterial).opacity =
        visibility * layer * lit * 0.75;
    });
    history.current.forEach((label, i) => {
      if (label)
        label.style.opacity = String(
          s.reputation *
            lit *
            smoothstep(mapProgress(i / 8, i / 8 + 0.1, earned))
        );
    });
    historyRings.current.forEach((ring, i) => {
      if (ring)
        (ring.material as MeshBasicMaterial).opacity =
          s.reputation *
          lit *
          smoothstep(mapProgress(i / 8, i / 8 + 0.1, earned)) *
          0.8;
    });
    if (identity.current)
      identity.current.style.opacity = String(
        visibility * opening * lit * (1 - s.reputation)
      );
    if (metadata.current) {
      const reveal = discoveryReveal(s.progress);
      // Essential metadata must remain readable after the searchlight reveals it.
      metadata.current.style.opacity = String(reveal.opacity);
      metadata.current.style.filter =
        reveal.blur === 0
          ? "none"
          : `blur(${reveal.blur}px) brightness(${reveal.brightness})`;
    }
  });

  return (
    <group ref={group} position={[1.55, 0.1, -2]}>
      <mesh>
        <sphereGeometry args={[0.94, 40, 24]} />
        <meshBasicMaterial
          ref={shell}
          color="#251b15"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[0.1, 0.4, 0]}>
        <icosahedronGeometry args={[0.96, 2]} />
        <meshBasicMaterial
          color="#b98950"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.36, 2]} />
        <meshBasicMaterial color="#ffd396" transparent toneMapped={false} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.53, 24, 16]} />
        <meshBasicMaterial
          color="#ff992e"
          transparent
          opacity={0.085}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {[0.64, 0.84, 1.08].map((radius, i) => (
        <group key={radius} rotation={[0.4 + i * 0.45, i * 0.65, 0]}>
          <mesh
            ref={(node) => {
              rings.current[i] = node;
            }}
          >
            <torusGeometry
              args={[radius, i === 0 ? 0.015 : 0.009, 8, 100, Math.PI * 1.83]}
            />
            <meshBasicMaterial
              color={i === 0 ? "#ffe0a7" : "#d89545"}
              transparent
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      {HISTORY.map((action, i) => {
        const angle = (i / HISTORY.length) * Math.PI * 2;
        return (
          <group key={`${action}-${i}`} rotation={[0, 0, angle]}>
            <mesh
              ref={(node) => {
                historyRings.current[i] = node;
              }}
              position={[0, 0, 0.15]}
            >
              <torusGeometry
                args={[
                  1.3,
                  i === 4 ? 0.007 : 0.02,
                  6,
                  28,
                  Math.PI * (i === 4 ? 0.1 : 0.22),
                ]}
              />
              <meshBasicMaterial
                color={i === 4 ? "#9e5d44" : "#ffc878"}
                transparent
                opacity={0.4}
              />
            </mesh>
          </group>
        );
      })}
      <Html position={[0.02, -2, 0]} center zIndexRange={[4, 0]}>
        <div
          ref={identity}
          className="text-center"
          style={{ ...WORLD_LABEL_STYLE, opacity: 0 }}
        >
          <span className="block text-xs tracking-widest">SOUL CORE</span>
          <span className="mt-1 block opacity-50">
            Identity · Reputation · History
          </span>
        </div>
      </Html>
      {!mobile && (
        <Html position={[1.5, 0.75, 0]} zIndexRange={[4, 0]}>
          <div
            ref={metadata}
            className="border-l border-amber-200/35 pl-5"
            style={{
              ...WORLD_LABEL_STYLE,
              color: "#f0d3aa",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              opacity: 0,
            }}
          >
            <div className="mb-3 text-xs text-amber-100">AGENT 0x71F</div>
            <div>
              Identity <span className="ml-5 text-amber-100">Verified</span>
            </div>
            <div>
              Reputation <span className="ml-3 text-amber-100">92 / 100</span>
            </div>
            <div>
              Executions <span className="ml-3 text-amber-100">2,481</span>
            </div>
            <div>
              Failures <span className="ml-6 text-amber-100">3</span>
            </div>
            <div>
              Soul <span className="ml-12 text-amber-100">Active</span>
            </div>
          </div>
        </Html>
      )}
      {HISTORY.map((action, i) => {
        const angle = (i / HISTORY.length) * Math.PI * 2;
        return (
          <Html
            key={`${action}-label-${i}`}
            position={[Math.cos(angle) * 1.85, Math.sin(angle) * 1.65, 0.15]}
            center
            zIndexRange={[4, 0]}
          >
            <div
              ref={(node) => {
                history.current[i] = node;
              }}
              style={{
                ...WORLD_LABEL_STYLE,
                color: i === 4 ? "#a67663" : "#e6ba85",
                opacity: 0,
              }}
            >
              {action} {i === 4 ? "×" : "✓"}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
