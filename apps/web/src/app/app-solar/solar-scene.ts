export const planets = [
  { name: "Mercury", color: "#93857a", radius: 6 },
  { name: "Venus", color: "#b99a63", radius: 9 },
  { name: "Earth", color: "#687e81", radius: 10 },
  { name: "Mars", color: "#a96143", radius: 7 },
  { name: "Jupiter", color: "#b18a68", radius: 20 },
  { name: "Saturn", color: "#c4a269", radius: 16 },
  { name: "Uranus", color: "#8c9a93", radius: 13 },
  { name: "Neptune", color: "#586879", radius: 12 },
] as const;

type Planet = (typeof planets)[number];
type ScreenPoint = { x: number; y: number };

const orbitSamples = 144;
const orbitSpacing = .105;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));

export const solverOrbits = planets.map((_, index) => {
  const radius = .25 + index * orbitSpacing;
  const pointAt = (angle: number) => [
    radius * (Math.cos(angle) - .075),
    radius * .997 * Math.sin(angle),
  ] as const;
  return {
    point: pointAt(-1.12 + index * goldenAngle),
    path: Array.from({ length: orbitSamples }, (_, sample) =>
      pointAt(sample * 2 * Math.PI / orbitSamples),
    ),
  };
});

const spriteSize = 72;
const lamp = [42, 30, 14];
const rimLight = [59, 39, 19];
const shadow = [13, 11, 13];
const ice = [197, 190, 169];
const earthLand = [125, 123, 88];
export const surfaceStyles = [
  { tilt: .03, bands: 0 },
  { tilt: -.11, bands: 2 },
  { tilt: .4, bands: 0 },
  { tilt: .44, bands: 0 },
  { tilt: .06, bands: 12 },
  { tilt: .47, bands: 18 },
  { tilt: 1.71, bands: 5 },
  { tilt: .49, bands: 7 },
] as const;

export function planetSurface(index: number, rgb: readonly number[], longitude: number, latitude: number) {
  const { bands } = surfaceStyles[index];
  const ripples = Math.sin(5 * longitude + 3 * Math.sin(latitude * 7))
    * Math.cos(latitude * 9 - longitude * 2);
  const detail = Math.sin(longitude * 21 + latitude * 13)
    * Math.cos(latitude * 27 - longitude * 11);
  const continents = Math.sin(longitude * 2 + Math.sin(latitude * 5))
    + Math.cos(latitude * 7 - longitude * 3) * .52 + ripples * .28;
  const striped = bands > 0
    ? Math.sin(latitude * bands + .35 * ripples) * .12
    : 0;
  const broad = Math.cos(longitude * 2 + latitude * 3) * Math.cos(latitude) ** 2;
  const cloudWarp = latitude + .025 * Math.sin(longitude * 4) + .035 * ripples;
  const bandsDetail = bands
    ? Math.sin(cloudWarp * bands * 2.7) * .16 + Math.sin(cloudWarp * bands * 7) * .045
    : 0;
  const stormX = Math.sin((longitude - 1.3) / 2) * 7;
  const stormY = (latitude + .24) * 11;
  const stormDistance = Math.hypot(stormX, stormY);
  const storm = index === 4
    ? Math.exp(-1.3 * stormDistance ** 2) * (.30 + .09 * Math.cos(stormDistance * 17))
    : 0;
  const fineGrain = Math.sin(97 * longitude + 53 * latitude)
    * Math.cos(82 * latitude - 71 * longitude);
  const texture = 1 + broad * .21 + ripples * .20 + detail * .075 + striped
    + bandsDetail + fineGrain * .035 - storm;
  const land = index === 2 && continents > .38;
  const frost = index === 2 && Math.abs(latitude) > 1.19;
  return { hue: frost ? ice : land ? earthLand : rgb, texture };
}

const spherePixels = Array.from({ length: spriteSize ** 2 }, (_, index) => {
  const x = ((index % spriteSize) + .5) * 2 / spriteSize - 1;
  const y = (Math.floor(index / spriteSize) + .5) * 2 / spriteSize - 1;
  const distance = Math.hypot(x, y);
  return { x, y, z: Math.sqrt(Math.max(0, 1 - distance * distance)), edge: Math.min(1, (1 - distance) * spriteSize / 2) };
});

export function createPlanetPainter(planet: Planet, index: number) {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = spriteSize;
  const surface = sprite.getContext("2d");
  const image = surface?.createImageData(spriteSize, spriteSize);
  const rgb = [1, 3, 5].map((offset) => parseInt(planet.color.slice(offset, offset + 2), 16));
  const { tilt } = surfaceStyles[index];
  const cosine = Math.cos(tilt);
  const sine = Math.sin(tilt);
  const hasRing = planet.name === "Saturn";
  let lastFrame = Number.NaN;
  let lastDirection = Number.NaN;

  return function paint(
    ctx: CanvasRenderingContext2D,
    { x, y }: ScreenPoint,
    sun: ScreenPoint,
    radius: number,
    azimuth: number,
  ) {
    if (!surface || !image) return;
    const direction = Math.atan2(sun.y - y, sun.x - x);
    const slot = Math.round(azimuth * 80);
    if (slot !== lastFrame || !(Math.abs(direction - lastDirection) < .025)) {
      lastFrame = slot;
      lastDirection = direction;
      const phase = -slot / 80;
      const lightX = Math.cos(direction) * .93;
      const lightY = Math.sin(direction) * .93;
      spherePixels.forEach(({ x, y, z, edge }, pixel) => {
        if (edge <= 0) return;
        const axisX = x * cosine + y * sine;
        const axisY = -x * sine + y * cosine;
        const longitude = Math.atan2(axisX, z) + phase;
        const latitude = Math.asin(axisY);
        const sunlight = Math.max(0, x * lightX + y * lightY + z * .36);
        const shade = .04 + sunlight ** .85 * .92;
        const { hue, texture } = planetSurface(index, rgb, longitude, latitude);
        const offset = pixel * 4;
        for (let channel = 0; channel < 3; channel++) {
          const warmth = sunlight * lamp[channel];
          const rim = (1 - z) ** 3 * sunlight * rimLight[channel];
          image.data[offset + channel] = shadow[channel] * (1 - sunlight) + hue[channel] * texture * shade + warmth + rim;
        }
        image.data[offset + 3] = edge * 255;
      });
      surface.putImageData(image, 0, 0);
    }

    ctx.save();
    ctx.translate(x, y);
    if (hasRing) paintRing(ctx, radius, false);
    ctx.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
    if (hasRing) paintRing(ctx, radius, true);
    ctx.restore();
  };
}

function paintRing(ctx: CanvasRenderingContext2D, radius: number, foreground: boolean) {
  const start = foreground ? 0 : Math.PI;
  for (const [scale, tone] of [[1.43, "#8f684ca0"], [1.59, "#ddba82bd"], [1.78, "#9d80568f"]] as const) {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * scale, radius * scale * .28, -.47, start, start + Math.PI);
    ctx.strokeStyle = tone;
    ctx.lineWidth = radius * .085;
    ctx.stroke();
  }
}
