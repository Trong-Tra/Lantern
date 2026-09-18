import * as THREE from "three";

export interface PetalProfile {
  height: number;
  width: number;
  bulge: number;
  tipRadius: number;
}

// Curved radial surfaces share a narrow brass seat and open into pointed petals.
function petalPoint(t: number, u: number, profile: PetalProfile) {
  const envelope = Math.pow(Math.sin(Math.PI * t), 0.85);
  const width = profile.width * envelope * (1 - 0.3 * t);
  const radius =
    0.12 +
    profile.bulge * Math.sin(Math.PI * t * 0.92) +
    profile.tipRadius * t * t;
  return new THREE.Vector3(
    width * u,
    -0.65 + profile.height * t,
    radius - width * 0.42 * u * u
  );
}

export function createLotusPetal(profile: PetalProfile) {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rows = 48;
  const columns = 20;
  const warm = new THREE.Color("#a66b2c");
  const ivory = new THREE.Color("#ffedc5");
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = (column / columns) * 2 - 1;
      positions.push(...petalPoint(t, u, profile).toArray());
      const center = Math.pow(1 - Math.abs(u), 0.35);
      const grain = Math.sin(t * 410 + u * 93) * 0.017;
      const color = warm
        .clone()
        .lerp(
          ivory,
          THREE.MathUtils.clamp(
            0.26 + center * 0.54 + Math.sin(t * Math.PI) * 0.16 + grain,
            0,
            1
          )
        );
      colors.push(color.r, color.g, color.b);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        const b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const surface = new THREE.BufferGeometry();
  surface.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  surface.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  surface.setIndex(indices);
  surface.computeVertexNormals();
  const ribs = [-1, 0, 1].map((u) => {
    const points = Array.from({ length: 49 }, (_, i) => {
      const point = petalPoint(i / 48, u, profile);
      point.z += 0.004;
      return point;
    });
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      48,
      u === 0 ? 0.003 : 0.006,
      5,
      false
    );
  });
  return { surface, ribs };
}
