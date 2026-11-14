"use client";
import { useEffect, useImperativeHandle, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Box3,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineSegments,
  LineBasicMaterial,
  Points,
  Mesh,
  ShaderMaterial,
  DoubleSide,
} from "three";
import { journeyState, chapterObjectTravel } from "@/libs/cinematic/chapter-transition";
import {
  CONCEPT_SEGMENTS,
  CONCEPT_STRANDS,
  conceptResponse,
  conceptPacket,
  conceptNode,
} from "@/libs/cinematic/lantern-line-concepts";

import { getPathFrames } from "@/libs/cinematic/precomputed-paths";
import { samplePathFrame } from "@/libs/cinematic/path-frames";

/** Each world retains its complete artwork while the viewer travels between them. */
export function LivingLight({ lantern, objects }: { lantern: RefObject<Group | null>; objects?: RefObject<Group | null> }) {
  const group = useRef<Group>(null);
  useImperativeHandle(objects, () => group.current!, []);
  return <group ref={group}>{[4, 5, 6, 7, 8, 9, 10].map(chapter =>
    <ChapterLight key={chapter} lantern={lantern} chapter={chapter} />
  )}</group>;
}

function ChapterLight({ lantern, chapter: ownChapter }: { lantern: RefObject<Group | null>; chapter: number }) {
  const group = useRef<Group>(null);
  const compositionBounds = useMemo(() => new Box3(), []);
  const lanternBounds = useMemo(() => new Box3(), []);
  const screenCorner = useMemo(() => new Vector3(), []);
  const centerShift = useMemo(() => new Vector3(), []);

  const
    lines = useRef<LineSegments>(null),
    signals = useRef<Points>(null),
    elapsed = useRef(0);
  const bands = useRef<Mesh>(null),
    dust = useRef<Points>(null);
  const bandUniforms = useMemo(() => ({ presence: { value: 0 } }), []);
  const bandGeometry = useMemo(() => {
    const g = new BufferGeometry(),
      count = CONCEPT_STRANDS * CONCEPT_SEGMENTS * 6;
    g.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(count * 3), 3)
    );
    const uv = [];
    for (let strand = 0; strand < CONCEPT_STRANDS; strand++)
      for (let i = 0; i < CONCEPT_SEGMENTS; i++) {
        const a = i / CONCEPT_SEGMENTS,
          b = (i + 1) / CONCEPT_SEGMENTS;
        uv.push(a, 0, b, 0, a, 1, a, 1, b, 0, b, 1);
      }
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    return g;
  }, []);
  const dustGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(180 * 3), 3)
    );
    return g;
  }, []);
  const geometry = useMemo(() => {
    const result = new BufferGeometry(),
      vertices = CONCEPT_STRANDS * CONCEPT_SEGMENTS * 2;
    result.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(vertices * 3), 3)
    );
    result.setAttribute(
      "color",
      new Float32BufferAttribute(new Float32Array(vertices * 3), 3)
    );
    return result;
  }, []);
  const signalGeometry = useMemo(() => {
    const result = new BufferGeometry();
    result.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(12 * 3), 3)
    );
    result.setAttribute(
      "energy",
      new Float32BufferAttribute(new Float32Array(12), 1)
    );
    result.setAttribute(
      "seal",
      new Float32BufferAttribute(
        Array.from({ length: 12 }, (_, i) => (i < 6 ? 0 : 1)),
        1
      )
    );
    return result;
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      signalGeometry.dispose();
      bandGeometry.dispose();
      dustGeometry.dispose();
    },
    [geometry, signalGeometry, bandGeometry, dustGeometry]
  );
  useFrame(({ camera, size }, delta) => {
    if (!group.current || !lines.current || !lantern.current) return;
    const travel = chapterObjectTravel(ownChapter, journeyState.chapters);
    const presence = ownChapter === 4 && journeyState.transition < 4
      ? journeyState.chapters[4]
      : ownChapter === 10 && journeyState.transition >= 10
        ? journeyState.chapters[10] : 1;
    group.current.visible = travel.visible && presence > 0.001;
    if (!group.current.visible) return;
    const weights = Array<number>(12).fill(0);
    weights[ownChapter] = 1;
    if (!journeyState.reducedMotion) elapsed.current += Math.min(delta, 0.05);
    const time = journeyState.reducedMotion ? 10.8 : elapsed.current;
    const frames = new Map<number, NonNullable<ReturnType<typeof getPathFrames>>>();
    for (let chapter = 4; chapter <= 10; chapter++) {
      if (weights[chapter] <= 0.0001) continue;
      const prepared = getPathFrames(chapter, time);
      if (!prepared) { group.current.visible = false; return; }
      frames.set(chapter, prepared);
      if (chapter > 4) getPathFrames(chapter - 1, time);
      if (chapter < 10) getPathFrames(chapter + 1, time);
    }
    group.current.position.copy(lantern.current.position);
    group.current.position.z -= 0.65;
    group.current.position.x += size.width < 760 ? 0.25 : 0.65;
    group.current.quaternion.copy(camera.quaternion);
    group.current.scale.setScalar(size.width < 760 ? 0.59 : 1);
    const positions = lines.current.geometry.attributes.position,
      colors = lines.current.geometry.attributes.color;
    let response = 0;
    for (let chapter = 4; chapter <= 10; chapter++)
      response += conceptResponse(chapter, time) * weights[chapter];
    if (journeyState.chapters[ownChapter] > 0.5) journeyState.artResponse = response;
    for (let strand = 0; strand < CONCEPT_STRANDS; strand++)
      for (let segment = 0; segment < CONCEPT_SEGMENTS; segment++)
        for (let end = 0; end < 2; end++) {
          const u = (segment + end) / CONCEPT_SEGMENTS,
            vertex = (strand * CONCEPT_SEGMENTS + segment) * 2 + end;
          const point = [0, 0, 0];
          const target = samplePathFrame(frames.get(ownChapter)!, strand, u);
          for (let axis = 0; axis < 3; axis++) point[axis] = target[axis];
          positions.setXYZ(vertex, point[0], point[1], point[2]);
          // Keep illumination steady; idle motion comes from the orbital geometry.
          const brightness = strand < 6 ? 0.55 : 0.72;
          const cool = strand % 6 === 0 ? 0.35 : 0;
          colors.setXYZ(
            vertex,
            brightness * (1 - cool * 0.22),
            brightness * (0.77 + cool * 0.35),
            brightness * (0.4 + cool)
          );
        }
    // Fine bronze surfaces sit between paired luminous edges, with light travelling along them.
    if (bands.current) {
      const surface = bands.current.geometry.attributes.position;
      for (let strand = 0; strand < CONCEPT_STRANDS; strand++)
        for (let segment = 0; segment < CONCEPT_SEGMENTS; segment++) {
          const offset = (strand * CONCEPT_SEGMENTS + segment) * 2;
          const ax = positions.getX(offset),
            ay = positions.getY(offset),
            az = positions.getZ(offset),
            bx = positions.getX(offset + 1),
            by = positions.getY(offset + 1),
            bz = positions.getZ(offset + 1);
          const length = Math.hypot(bx - ax, by - ay) || 1,
            half = strand < 6 ? 0.0025 : strand >= 24 ? 0.007 : 0.018;
          const nx = (-(by - ay) / length) * half,
            ny = ((bx - ax) / length) * half;
          const corners = [
            [ax - nx, ay - ny, az],
            [bx - nx, by - ny, bz],
            [ax + nx, ay + ny, az],
            [ax + nx, ay + ny, az],
            [bx - nx, by - ny, bz],
            [bx + nx, by + ny, bz],
          ];
          for (let i = 0; i < 6; i++)
            surface.setXYZ(
              (strand * CONCEPT_SEGMENTS + segment) * 6 + i,
              ...(corners[i] as [number, number, number])
            );
        }
      surface.needsUpdate = true;
      bands.current.geometry.computeBoundingSphere();
      (bands.current.material as ShaderMaterial).uniforms.presence.value =
        presence;
    }
    if (dust.current) {
      const stars = dust.current.geometry.attributes.position;
      for (let i = 0; i < 180; i++) {
        const strand = 6 + (i % (CONCEPT_STRANDS - 6)),
          u =
            (((i * 0.61803398875 + time * (i % 2 ? 0.012 : -0.009)) % 1) + 1) %
            1,
          point = [0, 0, 0];
        const target = samplePathFrame(frames.get(ownChapter)!, strand, u);
        for (let axis = 0; axis < 3; axis++) point[axis] = target[axis];
        stars.setXYZ(i, point[0], point[1], point[2]);
      }
      stars.needsUpdate = true;
      dust.current.geometry.computeBoundingSphere();
    }
    if (signals.current) {
      const signalPositions = signals.current.geometry.attributes.position,
        energies = signals.current.geometry.attributes.energy;
      for (let index = 0; index < 12; index++) {
        const point = [0, 0, 0];
        let energy = 0;
        for (let chapter = 4; chapter <= 10; chapter++)
          if (weights[chapter] > 0.0001) {
            const weight = weights[chapter],
              packet = conceptPacket(chapter, index % 6, time);
            const target =
              index < 6 ? packet.point : conceptNode(chapter, index - 6);
            for (let axis = 0; axis < 3; axis++)
              point[axis] += target[axis] * weight;
            const phase = (time % 12) / 12,
              node = index - 6;
            const nodeCount =
              chapter === 7 || chapter === 9
                ? 4
                : chapter === 6 || chapter === 8
                  ? 3
                  : 6;
            const arrived =
              chapter === 4 || chapter === 5
                ? phase > node * 0.12 + 0.13
                : chapter === 7
                  ? phase > 0.05 + ((node + 1) * 0.82) / 4
                  : chapter === 9
                    ? phase > 0.6 && node === 2
                    : chapter === 8
                      ? phase > 0.84
                      : phase > 0.35;
            energy +=
              (index < 6
                ? packet.energy
                : index - 6 < nodeCount
                  ? arrived
                    ? 0.8
                    : 0.12
                  : 0) *
              weight *
              presence;
          }
        signalPositions.setXYZ(index, point[0], point[1], point[2]);
        energies.setX(
          index,
          energies.getX(index) +
            (energy - energies.getX(index)) *
              (1 - Math.exp(-Math.min(delta, 0.05) * 3))
        );
      }
      signalPositions.needsUpdate = true;
      energies.needsUpdate = true;
      signals.current.geometry.computeBoundingSphere();
    }
    (lines.current.material as LineBasicMaterial).opacity = presence * 0.5;
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    lines.current.geometry.computeBoundingSphere();
    lines.current.geometry.computeBoundingBox();
    if (size.width >= 760 && presence > 0.001) {
      // Center the combined visible artwork, rather than the lantern's pivot.
      lantern.current.updateWorldMatrix(true, true);
      group.current.updateWorldMatrix(true, false);
      compositionBounds.copy(lines.current.geometry.boundingBox!).applyMatrix4(group.current.matrixWorld);
      lanternBounds.setFromObject(lantern.current);
      compositionBounds.union(lanternBounds);
      let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
      for (let mask = 0; mask < 8; mask++) {
        screenCorner.set(
          mask & 1 ? compositionBounds.max.x : compositionBounds.min.x,
          mask & 2 ? compositionBounds.max.y : compositionBounds.min.y,
          mask & 4 ? compositionBounds.max.z : compositionBounds.min.z
        ).project(camera);
        left = Math.min(left, screenCorner.x); right = Math.max(right, screenCorner.x);
        bottom = Math.min(bottom, screenCorner.y); top = Math.max(top, screenCorner.y);
      }
      const side = (-weights[4] - weights[5] + weights.slice(6, 11).reduce((sum, weight) => sum + weight, 0)) / presence;
      const distance = camera.position.distanceTo(lantern.current.position);
      const halfWidth = distance / camera.projectionMatrix.elements[0];
      const halfHeight = distance / camera.projectionMatrix.elements[5];
      centerShift.set(
        (side * 0.5 - (left + right) * 0.5) * halfWidth * presence,
        -(bottom + top) * 0.5 * halfHeight * presence,
        0
      ).applyQuaternion(camera.quaternion);
      group.current.position.add(centerShift);
      if (journeyState.chapters[ownChapter] >= 0.5) {
        lantern.current.position.add(centerShift);
        lantern.current.updateWorldMatrix(true, false);
        screenCorner.set(0, -0.9, 0).applyMatrix4(lantern.current.matrixWorld).project(camera);
        journeyState.candleScreenX = screenCorner.x * 0.5 + 0.5;
        journeyState.candleScreenY = 0.5 - screenCorner.y * 0.5;
      }

    }
    centerShift.set(travel.x, 0, travel.z).applyQuaternion(camera.quaternion);
    group.current.position.add(centerShift);
  }, 0.1);
  return (
    <group ref={group}>
      <mesh ref={bands} geometry={bandGeometry}>
        <shaderMaterial
          uniforms={bandUniforms}
          side={DoubleSide}
          transparent
          depthWrite={false}
          toneMapped={false}
          vertexShader={`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
          fragmentShader={`uniform float presence;varying vec2 vUv;void main(){float edge=pow(abs(vUv.y-.5)*2.,3.);float polish=.35+.65*pow(sin(vUv.y*3.14159),4.);vec3 bronze=mix(vec3(.18,.105,.045),vec3(.88,.66,.31),polish);vec3 colour=bronze*.68+vec3(.7,.67,.55)*(edge*.18);gl_FragColor=vec4(colour,(.55+edge*.4)*presence);}`}
        />
      </mesh>
      <points ref={dust} geometry={dustGeometry}>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
          vertexShader={`void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=3.;}`}
          fragmentShader={`void main(){float r=length(gl_PointCoord-.5);float alpha=1.-smoothstep(.12,.5,r);gl_FragColor=vec4(vec3(1.,.8,.48),alpha*.35);}`}
        />
      </points>
      <lineSegments ref={lines} geometry={geometry}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </lineSegments>
      <points ref={signals} geometry={signalGeometry}>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
          vertexShader={`attribute float energy;attribute float seal;varying float power;varying float ring;void main(){power=energy;ring=seal;vec4 view=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*view;gl_PointSize=(seal>.5?11.:9.)*7./max(4.,-view.z);}`}
          fragmentShader={`varying float power;varying float ring;void main(){float r=length(gl_PointCoord-.5);float core=exp(-r*r*90.);float seal=exp(-pow((r-.28)*45.,2.))*ring;gl_FragColor=vec4(vec3(2.5,1.9,1.),(core+seal*.7)*power);}`}
        />
      </points>
    </group>
  );
}
