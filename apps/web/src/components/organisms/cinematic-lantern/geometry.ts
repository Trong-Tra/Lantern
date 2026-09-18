import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DataTexture,
  Float32BufferAttribute,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const SEGMENTS = 128;
const ROWS = 64;
const RIBS = 16;

function profile(t: number) {
  return 0.2 + 0.43 * Math.pow(Math.sin(Math.PI * t), 0.63) * (0.91 + t * 0.13);
}

function combine(parts: BufferGeometry[]) {
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error("Unable to build lantern geometry");
  return geometry;
}

function torus(radius: number, thickness: number, y: number) {
  const geometry = new TorusGeometry(radius, thickness, 6, 48);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}

function cylinder(top: number, bottom: number, height: number, y: number) {
  const geometry = new CylinderGeometry(top, bottom, height, 48);
  geometry.translate(0, y, 0);
  return geometry;
}

function makeSilk() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= ROWS; row++) {
    const t = row / ROWS;
    for (let segment = 0; segment <= SEGMENTS; segment++) {
      const angle = (segment / SEGMENTS) * Math.PI * 2;
      const r = profile(t) * (1 - 0.014 * Math.cos(angle * RIBS));
      positions.push(Math.sin(angle) * r, -1 + t * 2.12, Math.cos(angle) * r);
      uvs.push(segment / SEGMENTS, t);
      if (row < ROWS && segment < SEGMENTS) {
        const a = row * (SEGMENTS + 1) + segment;
        const b = a + SEGMENTS + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeRibs() {
  const parts: BufferGeometry[] = [];
  for (let rib = 0; rib < RIBS; rib++) {
    const angle = (rib / RIBS) * Math.PI * 2;
    const points: Vector3[] = [];
    for (let row = 0; row <= 32; row++) {
      const t = row / 32;
      const radius = profile(t) * 0.986 + 0.007;
      points.push(
        new Vector3(
          Math.sin(angle) * radius,
          -1 + t * 2.12,
          Math.cos(angle) * radius
        )
      );
    }
    parts.push(
      new TubeGeometry(new CatmullRomCurve3(points), 64, 0.0105, 5, false)
    );
  }
  return combine(parts);
}

function makeHardware() {
  const parts: BufferGeometry[] = [
    cylinder(0.22, 0.26, 0.1, 1.15),
    cylinder(0.13, 0.225, 0.1, 1.245),
    cylinder(0.075, 0.135, 0.075, 1.33),
    torus(0.235, 0.016, 1.105),
    torus(0.231, 0.012, 1.195),
    torus(0.141, 0.008, 1.285),
    cylinder(0.228, 0.21, 0.1, -1.04),
    cylinder(0.2, 0.1, 0.09, -1.135),
    cylinder(0.105, 0.055, 0.07, -1.208),
    torus(0.221, 0.012, -0.992),
    torus(0.222, 0.013, -1.083),
    torus(0.095, 0.01, -1.2),
    cylinder(0.034, 0.028, 0.085, -1.295),
  ];
  // Small impressed studs around each brass collar, restrained like handwork.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    for (const y of [1.15, -1.038]) {
      const bead = new TorusGeometry(0.011, 0.003, 4, 8);
      bead.rotateY(a);
      bead.translate(Math.sin(a) * 0.239, y, Math.cos(a) * 0.239);
      parts.push(bead);
    }
  }
  const ring = new TorusGeometry(0.079, 0.012, 8, 32);
  ring.translate(0, 1.43, 0);
  parts.push(ring);
  const bottomRing = new TorusGeometry(0.038, 0.008, 6, 20);
  bottomRing.translate(0, -1.372, 0);
  parts.push(bottomRing);
  return combine(parts);
}

function makeCord() {
  const parts: BufferGeometry[] = [];
  for (let strand = 0; strand < 2; strand++) {
    const points: Vector3[] = [];
    for (let i = 0; i <= 70; i++) {
      const y = 1.505 + (i / 70) * 1.5;
      const a = i * 0.65 + strand * Math.PI;
      points.push(new Vector3(Math.cos(a) * 0.005, y, Math.sin(a) * 0.005));
    }
    parts.push(
      new TubeGeometry(new CatmullRomCurve3(points), 140, 0.005, 4, false)
    );
  }
  return combine(parts);
}

function makeTassel() {
  const parts: BufferGeometry[] = [];
  for (let strand = 0; strand < 48; strand++) {
    const angle = (strand / 48) * Math.PI * 2;
    const radius = 0.017 + (strand % 4) * 0.009;
    const length = 0.72 + Math.sin(strand * 7.13) * 0.025;
    const points: Vector3[] = [];
    for (let row = 0; row <= 10; row++) {
      const t = row / 10;
      const flare = radius * (0.45 + t * 1.3);
      points.push(
        new Vector3(
          Math.sin(angle) * flare + Math.sin(t * 3.2) * 0.026,
          -t * length,
          Math.cos(angle) * flare
        )
      );
    }
    parts.push(
      new TubeGeometry(new CatmullRomCurve3(points), 12, 0.0032, 3, false)
    );
  }
  return combine(parts);
}

function makeFabricTexture(emission: boolean) {
  const width = 512;
  const height = 256;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const noise = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const grain = noise - Math.floor(noise);
      const weave = Math.sin(x * Math.PI * 0.91) * Math.sin(y * Math.PI * 0.97);
      const fold = Math.pow(Math.abs(Math.sin(u * RIBS * Math.PI)), 0.32);
      let value = 0.78 + fold * 0.14 + grain * 0.055 + weave * 0.025;
      if (emission)
        value *=
          (0.17 + Math.pow(Math.sin(v * Math.PI), 1.5) * 0.66) *
          (0.67 + fold * 0.33);
      const offset = (y * width + x) * 4;
      data[offset] = Math.round(value * 255);
      data[offset + 1] = Math.round(value * 255);
      data[offset + 2] = Math.round(value * 255);
      data[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createLanternGeometry() {
  return {
    silk: makeSilk(),
    ribs: makeRibs(),
    hardware: makeHardware(),
    cord: makeCord(),
    tassel: makeTassel(),
    fabric: makeFabricTexture(false),
    transmission: makeFabricTexture(true),
  };
}
