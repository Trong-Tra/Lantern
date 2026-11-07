"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from "three";
import {
  ease,
  journeyState,
  networkHandoff,
  ringBreath,
} from "@/libs/cinematic/chapter-transition";

import { getPathFrames } from "@/libs/cinematic/precomputed-paths";
import { samplePathFrame } from "@/libs/cinematic/path-frames";

export function NetworkLinks(props: {
  lantern: RefObject<Group | null>;
  time: RefObject<number>;
}) {
  return <><NetworkAssembly {...props} incoming={false} /><NetworkAssembly {...props} incoming /></>;
}

function NetworkAssembly({
  lantern,
  time,
  incoming,
}: {
  lantern: RefObject<Group | null>;
  time: RefObject<number>;
  incoming: boolean;
}) {
  const lines = useRef<LineSegments>(null);
  const scratch = useMemo(
    () => ({
      point: new Vector3(),
      center: new Vector3(),
      edge: new Vector3(),
    }),
    []
  );
  const geometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array((32 * 48 + (incoming ? 120 : 0)) * 6), 3)
    );
    result.setAttribute(
      "color",
      new Float32BufferAttribute(new Float32Array((32 * 48 + (incoming ? 120 : 0)) * 6), 3)
    );
    return result;
  }, [incoming]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ camera, gl }) => {
    if (!lines.current || !lantern.current) return;
    const weight = journeyState.chapters[1] + journeyState.chapters[2];
    const crossing =
      journeyState.transition === 1
        ? journeyState.portal
        : journeyState.chapters[2] > 0
          ? 1
          : 0;
    const handoff = networkHandoff(crossing);
    const presence = incoming ? handoff.incoming : handoff.outgoing;
    const formation = incoming ? 1 : 0;
    const turn = incoming ? handoff.incomingTurn : handoff.outgoingTurn;
    lines.current.visible = weight * presence > 0.001;
    if (!lines.current.visible) return;
    const root = lantern.current;
    const space = gl.domElement.clientWidth < 760 ? 0.55 : 1;
    scratch.center.copy(root.position).project(camera);
    scratch.edge
      .set(0.85, 1.4, 0)
      .multiplyScalar(root.scale.x)
      .add(root.position)
      .project(camera);
    const rx = Math.max(0.07, Math.abs(scratch.edge.x - scratch.center.x));
    const ry = Math.max(0.12, Math.abs(scratch.edge.y - scratch.center.y));
    const animationTime = journeyState.reducedMotion ? 0 : time.current;
    const frames = getPathFrames(incoming ? 1 : 0, animationTime);
    getPathFrames(incoming ? 0 : 1, animationTime);
    if (!frames) { lines.current.visible = false; return; }
    const breath = journeyState.reducedMotion ? 0.5 : ringBreath(animationTime).swell;
    const liveGeometry = lines.current.geometry;
    const positions = liveGeometry.attributes.position,
      colors = liveGeometry.attributes.color;
    for (let link = 0; link < 32; link++) {
      for (let segment = 0; segment < 48; segment++) {
        for (let end = 0; end < 2; end++) {
          const p = (segment + end) / 48;
          const pose = samplePathFrame(frames, link, p);
          scratch.point
            .set(
              pose[0] * Math.cos(turn) + pose[2] * Math.sin(turn),
              pose[1],
              -pose[0] * Math.sin(turn) + pose[2] * Math.cos(turn)
            )
            .multiplyScalar(space)
            .add(root.position);
          const vertex = (link * 48 + segment) * 2 + end;
          positions.setXYZ(
            vertex,
            scratch.point.x,
            scratch.point.y,
            scratch.point.z
          );
          scratch.point.project(camera);
          const distance = Math.hypot(
            (scratch.point.x - scratch.center.x) / rx,
            (scratch.point.y - scratch.center.y) / ry
          );
          const clearance = 0.04 + 0.96 * ease((distance - 0.8) / 0.75);
          const pulse = incoming || journeyState.reducedMotion
            ? 1
            : 0.7 + 0.3 * Math.sin(p * 15 - time.current * 1.4 + link) ** 2;
          const shimmer = incoming
            ? 1.4 + breath * 1.5
            : 1;
          const light = (incoming && link >= 24 ? 5 : 1) * (clearance + (1 - clearance) * formation) * pulse *
            (link < 16 ? 1 : 0.38 + formation * 0.62) * (incoming && link >= 24 ? 1 : shimmer);
          const logo = link >= 24 ? formation : 0;
          colors.setXYZ(
            vertex,
            light * (1 - logo * 0.28),
            light * (0.78 - logo * 0.22),
            light * (0.45 + logo * 0.55)
          );
        }
      }
    }
    if (incoming) {
      for (let tick = 0; tick < 120; tick++) {
        const angle = tick / 120 * Math.PI * 2 - animationTime * 0.025;
        for (let end = 0; end < 2; end++) {
          const radius = 2.66 + (end ? (tick % 10 === 0 ? 0.16 : 0.065) : 0);
          const vertex = 32 * 48 * 2 + tick * 2 + end;
          positions.setXYZ(vertex,
            root.position.x + (-1.7 + Math.cos(angle) * radius) * space,
            root.position.y + (1 + Math.sin(angle) * radius) * space,
            root.position.z - 1.8 * space);
          colors.setXYZ(vertex, 0.58, 0.43, 0.25);
        }
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    liveGeometry.computeBoundingSphere();
    (lines.current.material as LineBasicMaterial).opacity =
      weight * presence *
      (0.24 + formation * 0.66) *
      (journeyState.reducedMotion || crossing > 0
        ? 1
        : ease((time.current - 0.4) / 0.6));

  });
  return (
    <>
    <lineSegments ref={lines} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        toneMapped={false}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </lineSegments>
    </>
  );
}
