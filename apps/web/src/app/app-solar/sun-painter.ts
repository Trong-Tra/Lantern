const textureSize = 256;
const textureRadius = 72;
const surfaceWidth = 512;
const surfaceHeight = 256;
const axialTilt = -.13;
const rotationPeriod = 24000;

function lattice(x: number, y: number, z: number) {
  const seed = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);
  const mixed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 0xffffffff;
}

const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
const smooth = (value: number) => value * value * (3 - 2 * value);

function noise(x: number, y: number, z: number) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const u = smooth(x - i);
  const v = smooth(y - j);
  const w = smooth(z - k);
  const lower = mix(
    mix(lattice(i, j, k), lattice(i + 1, j, k), u),
    mix(lattice(i, j + 1, k), lattice(i + 1, j + 1, k), u), v,
  );
  const upper = mix(
    mix(lattice(i, j, k + 1), lattice(i + 1, j, k + 1), u),
    mix(lattice(i, j + 1, k + 1), lattice(i + 1, j + 1, k + 1), u), v,
  );
  return mix(lower, upper, w);
}

function bakeSurface() {
  const field = new Float32Array(surfaceWidth * surfaceHeight);
  for (let row = 0; row < surfaceHeight; row++) {
    const latitude = (row / (surfaceHeight - 1) - .5) * Math.PI;
    const y = Math.sin(latitude);
    const latitudeRadius = Math.cos(latitude);
    for (let column = 0; column < surfaceWidth; column++) {
      const longitude = column / surfaceWidth * 2 * Math.PI;
      const x = latitudeRadius * Math.sin(longitude);
      const z = latitudeRadius * Math.cos(longitude);
      const warp = noise(x * 4 + 13, y * 4 + 8, z * 4 + 5);
      const currents = noise(x * 8 + warp * 3, y * 8 - warp * 3, z * 8 + 11);
      const granules = noise(x * 29 + warp * 4, y * 29, z * 29 + 17);
      const filaments = 1 - Math.abs(2 * noise(x * 16, y * 16 + currents * 4, z * 16 + 23) - 1);
      field[row * surfaceWidth + column] =
        .17 + .37 * currents + .28 * granules + .18 * filaments ** 4;
    }
  }
  return field;
}

// Tangent-space ellipses leave only the exposed arcs of the plasma loops visible.
const prominences = [
  { angle: -.62, span: .21, height: .18 },
  { angle: 2.32, span: .15, height: .11 },
].map(({ angle, span, height }) => ({
  nx: Math.cos(angle), ny: Math.sin(angle), span, height,
}));

export function createSunPainter() {
  // Keep the corona in screen space and rotate the spherical surface beneath it.
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = textureSize;
  const surface = sprite.getContext("2d");
  if (!surface) return () => {};

  const image = surface.createImageData(textureSize, textureSize);
  const pixels = image.data;
  const disc: { offset: number; u: number; row: number; v: number; limb: number }[] = [];
  const cosine = Math.cos(axialTilt);
  const sine = Math.sin(axialTilt);
  for (let row = 0; row < textureSize; row++) {
    for (let column = 0; column < textureSize; column++) {
      const x = (column + .5 - textureSize / 2) / textureRadius;
      const y = (row + .5 - textureSize / 2) / textureRadius;
      const radius = Math.hypot(x, y);
      const edge = Math.min(1, Math.max(0, .5 + (1 - radius) * textureRadius));
      const offset = (row * textureSize + column) * 4;

      if (edge === 1) {
        const z = Math.sqrt(1 - radius * radius);
        const axisX = x * cosine + y * sine;
        const axisY = -x * sine + y * cosine;
        const u = surfaceWidth * (.5 + Math.atan2(axisX, z) / (2 * Math.PI));
        const latitude = (.5 + Math.asin(axisY) / Math.PI) * (surfaceHeight - 1);
        const row = Math.min(surfaceHeight - 2, Math.floor(latitude));
        disc.push({ offset, u, row, v: latitude - row, limb: .48 + .52 * Math.sqrt(z) });
        pixels[offset + 3] = 255;
        continue;
      }

      const height = Math.max(0, radius - 1);
      const angle = Math.atan2(y, x);
      const rays = .5 + .32 * Math.sin(angle * 11 + .8) + .18 * Math.sin(angle * 23);
      const halo = Math.exp(-height * 7) * .16;
      const corona = Math.exp(-height * (18 - rays * 10)) * (.16 + .22 * rays);
      const rim = Math.exp(-height * 95) * .4;
      let loops = 0;
      for (const { nx, ny, span, height: loopHeight } of prominences) {
        const tangent = (-ny * x + nx * y) / span;
        const outward = (nx * x + ny * y - .975) / loopHeight;
        const arc = Math.hypot(tangent, outward);
        loops += .58 * Math.exp(-((arc - 1) ** 2) * 135);
      }

      pixels[offset] = 246;
      pixels[offset + 1] = 108 + 91 * rim + 74 * loops;
      pixels[offset + 2] = 36 + 75 * rim + 49 * loops;
      pixels[offset + 3] = 255 * Math.max(edge, halo + corona + rim + loops);
    }
  }
  const field = bakeSurface();
  let previousTurn = Number.NaN;
  return function paintSun(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    elapsed: number,
    azimuth: number,
  ) {
    const turn = ((elapsed / rotationPeriod - azimuth / (2 * Math.PI)) % 1 + 1) % 1;
    if (turn !== previousTurn) {
      previousTurn = turn;
      for (const { offset, u, row, v, limb } of disc) {
        const longitude = (u + turn * surfaceWidth) % surfaceWidth;
        const left = Math.floor(longitude);
        const right = (left + 1) % surfaceWidth;
        const fraction = longitude - left;
        const top = row * surfaceWidth;
        const bottom = top + surfaceWidth;
        const heat = limb * mix(
          mix(field[top + left], field[top + right], fraction),
          mix(field[bottom + left], field[bottom + right], fraction), v,
        );
        pixels[offset] = 145 + 140 * heat;
        pixels[offset + 1] = 43 + 202 * heat;
        pixels[offset + 2] = 14 + 126 * heat ** 1.8;
      }
      surface.putImageData(image, 0, 0);
    }
    const diameter = radius * textureSize / textureRadius;
    context.drawImage(sprite, x - diameter / 2, y - diameter / 2, diameter, diameter);
  };
}
