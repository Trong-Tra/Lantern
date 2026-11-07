"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  LineBasicMaterial,
  Mesh,
  ShaderMaterial,
  DoubleSide,
  AdditiveBlending,
  Vector3,
  CatmullRomCurve3,
} from "three";
import {
  journeyState,
  ease,
  entranceReveal,
  stripeArrival,
} from "@/libs/cinematic/chapter-transition";
import {
  lineHandoff,
  linePiece,
  openingStripe,
} from "@/libs/cinematic/line-story";
export function LineWorld({ anchor }: { anchor: RefObject<Vector3> }) {
  const group = useRef<Group>(null);
  const lines = useRef<LineSegments>(null);
  const ribbon = useRef<Mesh>(null);
  const ribbonMaterial = useRef<ShaderMaterial>(null);
  const ribbonUniforms = useMemo(() => ({ time: { value: 0 } }), []);
  const orbit = useRef(0);
  const curves = useMemo(
    () =>
      Array.from(
        { length: 2 },
        () =>
          new CatmullRomCurve3(
            Array.from({ length: 65 }, () => new Vector3()),
            false,
            "catmullrom",
            0.5
          )
      ),
    []
  );
  const endpoints = useMemo(() => [new Vector3(), new Vector3()], []);
  const ribbonGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(256 * 18), 3)
    );
    const uv = [];
    for (let i = 0; i < 256; i++) {
      const start = Math.floor(i / 2) / 128;
      const end = start + 1 / 128;
      uv.push(start, 0, end, 0, start, 1, start, 1, end, 0, end, 1);
    }
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    return g;
  }, []);
  useEffect(() => () => ribbonGeometry.dispose(), [ribbonGeometry]);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(128 * 6), 3)
    );
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock, gl, viewport, camera }, delta) => {
    if (!group.current || !lines.current || !ribbon.current) return;
    const entrance = entranceReveal(
      journeyState.reducedMotion || journeyState.entranceAt === 0
        ? 10
        : journeyState.entranceAt < 0
          ? 0
          : (performance.now() - journeyState.entranceAt) / 1000
    );
    const conceptPresence = journeyState.chapters.slice(4, 11).reduce((sum, weight) => sum + weight, 0);
    group.current.visible = entrance.objects > 0 && conceptPresence < .999;
    if (!group.current.visible) return;
    group.current.position.copy(anchor.current);
    group.current.position.z -= 1.4;
    group.current.scale.setScalar(
      (gl.domElement.clientWidth < 760 ? 0.65 : 1.1) * entrance.objects
    );
    const time = journeyState.reducedMotion ? 0 : clock.elapsedTime;
    if (ribbonMaterial.current)
      ribbonMaterial.current.uniforms.time.value = time;
    const openingSeconds =
      journeyState.reducedMotion || journeyState.ignitionAt === 0
        ? 10
        : journeyState.ignitionAt < 0
          ? 0
          : (performance.now() - journeyState.ignitionAt) / 1000;
    const view = viewport.getCurrentViewport(camera, group.current.position);
    if (
      !journeyState.reducedMotion &&
      openingSeconds >= 5.4 &&
      journeyState.chapters[0] > 0.999 &&
      journeyState.portal === 0
    )
      orbit.current += Math.min(delta, 0.05) * 0.45;
    const attr = lines.current.geometry.attributes.position;
    const surface = ribbon.current.geometry.attributes.position;
    const ribbonWeight =
      journeyState.transition === 0 && !journeyState.reducedMotion
        ? ease((journeyState.portal - 0.18) / 0.1) *
          (1 - ease((journeyState.portal - 0.76) / 0.1))
        : 0;
    lines.current.visible = ribbonWeight < 0.999;
    const lineMaterial = lines.current.material as LineBasicMaterial;
    lineMaterial.opacity = .64 * (1 - conceptPresence) * (1 - ribbonWeight) * (1 - journeyState.chapters[1] - journeyState.chapters[2]);
    lineMaterial.color.set("#d9b77e");
    lineMaterial.color.r += conceptPresence * .9;
    lineMaterial.color.g += conceptPresence * .85;
    lineMaterial.color.b += conceptPresence * .6;
    const originalTone = conceptPresence < .001;
    if (lineMaterial.toneMapped !== originalTone) {
      lineMaterial.toneMapped = originalTone;
      lineMaterial.needsUpdate = true;
    }
    lineMaterial.depthWrite = originalTone;
    if (ribbon.current) ribbon.current.visible = ribbonWeight > 0.001;
    for (let i = 0; i < 128; i++) {
      const piece = [0, 0, 0, 0, 0, 0];
      journeyState.chapters.forEach((weight, chapter) => {
        if (weight === 0) return;
        const destination = linePiece(chapter, i, orbit.current, time);
        for (let axis = 0; axis < 6; axis++)
          piece[axis] += destination[axis] * weight;
      });
      let [x, y, z, u, v, w] = journeyState.reducedMotion
        ? piece
        : lineHandoff(
            journeyState.transition,
            journeyState.portal,
            i,
            piece,
            linePiece(0, i, orbit.current)
          );
      const arrival = stripeArrival(openingSeconds, i);
      if (arrival < 1)
        [x, y, z, u, v, w] = openingStripe(
          [x, y, z, u, v, w],
          i,
          arrival,
          (view.width * 1.6) / Math.max(0.001, group.current.scale.x)
        );
      const spanWeight =
        journeyState.transition === 0 && !journeyState.reducedMotion
          ? ease((journeyState.portal - 0.18) / 0.1) *
            (1 - ease((journeyState.portal - 0.76) / 0.1))
          : 0;
      if (spanWeight > 0) {
        const scale = Math.max(0.001, group.current.scale.x);
        const left =
          (camera.position.x - group.current.position.x - view.width * 0.65) /
          scale;
        const span = (view.width * 1.3) / scale;
        x += (left + ((x + 4) / 32) * span - x) * spanWeight;
        u += (left + ((u + 4) / 32) * span - u) * spanWeight;
      }
      attr.setXYZ(i * 2, x, y, z);
      attr.setXYZ(i * 2 + 1, u, v, w);
    }
    curves.forEach((curve, side) => {
      for (let n = 0; n < 64; n++)
        curve.points[n].fromBufferAttribute(attr, (n * 2 + side) * 2);
      curve.points[64].fromBufferAttribute(attr, (126 + side) * 2 + 1);
    });
    for (let i = 0; i < 256; i++) {
      const segment = Math.floor(i / 2);
      curves[i % 2].getPoint(segment / 128, endpoints[0]);
      curves[i % 2].getPoint((segment + 1) / 128, endpoints[1]);
      const { x, y, z } = endpoints[0];
      const { x: u, y: v, z: w } = endpoints[1];
      const width = 0.32 * ribbonWeight;
      // Joined band faces preserve the same material as the object unspools.
      const vertices = [
        [x, y - width, z],
        [u, v - width, w],
        [x, y + width, z],
        [x, y + width, z],
        [u, v - width, w],
        [u, v + width, w],
      ];
      vertices.forEach((point, vertex) =>
        surface.setXYZ(i * 6 + vertex, ...(point as [number, number, number]))
      );
    }
    surface.needsUpdate = true;
    ribbon.current.geometry.computeVertexNormals();
    ribbon.current.geometry.computeBoundingSphere();
    attr.needsUpdate = true;
    lines.current.geometry.computeBoundingSphere();
    group.current.rotation.y =
      Math.sin(time * 0.18) *
      0.15 *
      (1 - ribbonWeight) *
      (1 - journeyState.chapters[0]);
  });
  return (
    <group ref={group}>
      <mesh ref={ribbon} geometry={ribbonGeometry}>
        <shaderMaterial
          ref={ribbonMaterial}
          uniforms={ribbonUniforms}
          toneMapped={false}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          vertexShader={`varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`}
          fragmentShader={`varying vec2 vUv; uniform float time;
            void main() {
              float ripple = sin(vUv.x * 45. - time * 1.8) * .012;
              float distanceToCore = abs(vUv.y - 0.5 + ripple) * 2.0;
              float halo = exp(-distanceToCore * distanceToCore * 5.0);
              float core = exp(-distanceToCore * distanceToCore * 100.0);
              float edge = 1.0 - smoothstep(0.65, 1.0, distanceToCore);
              vec3 light = mix(vec3(0.85, 0.39, 0.09), vec3(1.0, 0.84, 0.52), core);
              float breath = .85 + .15 * sin(time * .85);
              float flow = pow(.5 + .5 * sin(vUv.x * 32. - time * 2.2), 3.);
              float current = .78 + flow * .5 + .08 * sin(vUv.x * 61. - time * 3.1);
              gl_FragColor = vec4(light * (0.65 + core * 0.7) * breath * current, (halo * 0.3 + core * 0.65) * edge);
            }`}
        />
      </mesh>
      <lineSegments ref={lines} geometry={geometry}>
        <lineBasicMaterial color="#d9b77e" transparent opacity={0.64} />
      </lineSegments>
    </group>
  );
}
