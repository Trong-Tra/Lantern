import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D } from "three";

import { cinematicState } from "@/libs/cinematic/runtime";
import { mapProgress } from "@/libs/cinematic/progress";

import { INFRASTRUCTURE, WORLD_LABEL_STYLE } from "../constants/network";
import { illuminationAt } from "../constants/lighting";
import type { WorldSettings } from "../types";

const particle = new Object3D();

export function Infrastructure({ mobile, reducedMotion }: WorldSettings) {
  const group = useRef<Group>(null);
  const layers = useRef<(Mesh | null)[]>([]);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const pulses = useRef<InstancedMesh>(null);
  const count = mobile ? 30 : 90;

  useFrame(({ clock }) => {
    const s = cinematicState;
    const progress = mapProgress(0.82, 0.905, s.progress);
    const time = reducedMotion ? 0 : clock.elapsedTime * 0.13;
    if (group.current) {
      group.current.visible = s.infrastructure > 0.001;
      group.current.scale.setScalar(mobile ? 0.67 : 1);
      group.current.position.set(mobile ? 0 : 1.65, mobile ? 1.8 : 0.2, -2.4);
    }
    layers.current.forEach((layer, i) => {
      if (!layer) return;
      const lit =
        0.35 +
        illuminationAt(
          mobile ? 0 : 1.65,
          (mobile ? 1.8 : 0.2) + (1.4 - i * 0.7) * (mobile ? 0.67 : 1),
          -2.4
        ) *
          0.65;
      (layer.material as MeshBasicMaterial).opacity =
        s.infrastructure * (0.15 + progress * 0.55) * lit;
      layer.rotation.z = i * 0.22 + progress * 0.5;
      if (labels.current[i])
        labels.current[i]!.style.opacity = String(s.infrastructure * lit);
    });
    if (!pulses.current) return;
    const active = Math.floor(3 + progress * (count - 3));
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399;
      const radius = 0.35 + ((i % 9) / 8) * 1.4;
      const fall = (i * 0.177 + progress * 5 + time) % 1;
      particle.position.set(
        Math.cos(angle) * radius,
        1.65 - fall * 3.3,
        Math.sin(angle) * radius * 0.4
      );
      particle.scale.setScalar(i < active ? 0.025 : 0);
      particle.updateMatrix();
      pulses.current.setMatrixAt(i, particle.matrix);
    }
    pulses.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} position={[1.65, 0.2, -2.4]}>
      {INFRASTRUCTURE.map((layer, i) => (
        <group key={layer} position={[0, 1.4 - i * 0.7, 0]}>
          <mesh
            ref={(node) => {
              layers.current[i] = node;
            }}
            rotation={[Math.PI / 2 - 0.12, 0, i * 0.22]}
          >
            <torusGeometry
              args={[1.6 + i * 0.065, i === 4 ? 0.027 : 0.012, 8, 100]}
            />
            <meshBasicMaterial
              color={i === 4 ? "#a48acd" : "#e7b26b"}
              transparent
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.55, 64]} />
            <meshBasicMaterial
              color={i === 4 ? "#74609c" : "#b7803e"}
              transparent
              opacity={0.028}
              depthWrite={false}
            />
          </mesh>
          <Html position={[2.03, 0.05, 0]} zIndexRange={[4, 0]}>
            <div
              ref={(node) => {
                labels.current[i] = node;
              }}
              style={{
                ...WORLD_LABEL_STYLE,
                color: i === 4 ? "#beace0" : "#e6ba85",
                fontSize: mobile ? "8px" : "10px",
                opacity: 0,
              }}
            >
              <span className="mr-3 opacity-40">0{i + 1}</span>
              {layer.toUpperCase()}
            </div>
          </Html>
        </group>
      ))}
      <instancedMesh
        ref={pulses}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 5]} />
        <meshBasicMaterial color="#ffe0ac" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
