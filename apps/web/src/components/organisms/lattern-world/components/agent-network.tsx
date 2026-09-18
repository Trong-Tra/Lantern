import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  Object3D,
  Vector3,
} from "three";

import { cinematicState } from "@/libs/cinematic/runtime";
import { clamp, smoothstep } from "@/libs/cinematic/progress";
import {
  discoveryBackdropFocus,
  discoveryBackdropVisibility,
} from "@/libs/cinematic/discovery";
import {
  pathBackdropFocus,
  pathBackdropScreenX,
  pathBackdropVisibility,
} from "@/libs/cinematic/path-visibility";

import { AGENTS, EDGES } from "../constants/network";
import type { WorldSettings } from "../types";

const transform = new Object3D();
const color = new Color();
const direction = new Vector3();
const toNode = new Vector3();
const projectedNode = new Vector3();
const amber = new Color("#ffb85d");
const muted = new Color("#593625");

export function AgentNetwork({ mobile, reducedMotion }: WorldSettings) {
  const nodes = useRef<InstancedMesh>(null);
  const halos = useRef<InstancedMesh>(null);
  const edgeColors = useRef<BufferAttribute>(null);
  const edgePositions = useRef<BufferAttribute>(null);
  const count = mobile ? 48 : AGENTS.length;
  const edges = useMemo(
    () => EDGES.filter(([a, b]) => a < count && b < count),
    [count]
  );
  const positions = useMemo(
    () =>
      new Float32Array(
        edges.flatMap(([a, b]) => [
          ...AGENTS[a].position,
          ...AGENTS[b].position,
        ])
      ),
    [edges]
  );
  const colors = useMemo(() => new Float32Array(edges.length * 6), [edges]);
  const strengths = useRef(new Float32Array(AGENTS.length));
  const backdrop = useRef(new Float32Array(AGENTS.length));
  const displayedPositions = useRef(new Float32Array(AGENTS.length * 3));

  useFrame(({ clock, camera }) => {
    if (!nodes.current || !halos.current) return;
    const s = cinematicState;
    direction
      .set(s.beamX - s.lanternX, s.beamY - s.lanternY, s.beamZ - s.lanternZ)
      .normalize();
    const time = reducedMotion ? 0 : clock.elapsedTime;
    const focus = mobile ? 0 : discoveryBackdropFocus(s.progress);
    const pathFocus = mobile ? 0 : pathBackdropFocus(s.progress);
    const edgeFocus = mobile ? 0 : Math.max(pathFocus, s.executionFocus);
    for (let i = 0; i < count; i += 1) {
      const agent = AGENTS[i];
      const [x, y, z] = agent.position;
      const screenX = projectedNode.set(x, y, z).project(camera).x;
      projectedNode.x = pathBackdropScreenX(edgeFocus, screenX);
      if (edgeFocus > 0) projectedNode.unproject(camera);
      else projectedNode.set(x, y, z);
      projectedNode.toArray(displayedPositions.current, i * 3);
      const visibility =
        discoveryBackdropVisibility(focus, screenX) *
        pathBackdropVisibility(pathFocus, screenX) *
        (1 - s.executionFocus * 0.95);
      backdrop.current[i] = visibility;
      toNode.set(x - s.lanternX, y - s.lanternY, z - s.lanternZ).normalize();
      const cone = smoothstep(clamp((direction.dot(toNode) - 0.78) / 0.2));
      const finalLight = smoothstep(
        clamp((s.finale - (i / count) * 0.7) / 0.3)
      );
      let strength = 0.003 + s.network * cone * s.ignition * 0.76;
      if (agent.verified) strength += finalLight * 0.9;
      else strength *= 0.45 + Math.sin(time * 2.5 + i) ** 2 * 0.3;
      if (s.infrastructure > 0)
        strength +=
          s.infrastructure *
          (0.09 + Math.sin(s.progress * 140 + i) ** 12 * 0.45);
      strength *= visibility;
      strengths.current[i] = strength;
      const radius = 0.045 + agent.reputation / 1600;
      transform.position.copy(projectedNode);
      transform.scale.setScalar(radius * (1 + strength * 0.5));
      transform.updateMatrix();
      nodes.current.setMatrixAt(i, transform.matrix);
      color.copy(agent.verified ? amber : muted).multiplyScalar(strength * 1.9);
      nodes.current.setColorAt(i, color);
      transform.scale.setScalar(radius * (3 + strength * 2));
      transform.updateMatrix();
      halos.current.setMatrixAt(i, transform.matrix);
      halos.current.setColorAt(i, color.multiplyScalar(strength * 0.42));
    }
    nodes.current.instanceMatrix.needsUpdate = true;
    halos.current.instanceMatrix.needsUpdate = true;
    if (nodes.current.instanceColor)
      nodes.current.instanceColor.needsUpdate = true;
    if (halos.current.instanceColor)
      halos.current.instanceColor.needsUpdate = true;
    for (let i = 0; i < edges.length; i += 1) {
      const [a, b] = edges[i];
      const strength =
        (strengths.current[a] + strengths.current[b]) *
        0.27 *
        Math.min(backdrop.current[a], backdrop.current[b]);
      for (let endpoint = 0; endpoint < 2; endpoint += 1) {
        const nodeIndex = endpoint === 0 ? a : b;
        const offset = nodeIndex * 3;
        edgePositions.current?.setXYZ(
          i * 2 + endpoint,
          displayedPositions.current[offset],
          displayedPositions.current[offset + 1],
          displayedPositions.current[offset + 2]
        );
        edgeColors.current?.setXYZ(
          i * 2 + endpoint,
          amber.r * strength,
          amber.g * strength,
          amber.b * strength
        );
      }
    }
    if (edgeColors.current) edgeColors.current.needsUpdate = true;
    if (edgePositions.current) edgePositions.current.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh
        ref={nodes}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={halos}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          transparent
          opacity={0.11}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      <lineSegments frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            ref={edgePositions}
            attach="attributes-position"
            args={[positions, 3]}
            usage={DynamicDrawUsage}
          />
          <bufferAttribute
            ref={edgeColors}
            attach="attributes-color"
            args={[colors, 3]}
            usage={DynamicDrawUsage}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
