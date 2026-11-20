const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export type GlobePoint = readonly [number, number, number];

type LandTopology = {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: Array<Array<[number, number]>>;
  objects: { land: { geometries: Array<{ arcs: number[][][] }> } };
};

export function globePoint(longitude: number, latitude: number): GlobePoint {
  const horizontal = Math.cos(latitude * DEG);
  return [
    horizontal * Math.sin(longitude * DEG),
    Math.sin(latitude * DEG),
    horizontal * Math.cos(longitude * DEG),
  ];
}

export async function loadLand(signal: AbortSignal): Promise<GlobePoint[]> {
  const response = await fetch("/maps/land-110m.json", { signal });
  if (!response.ok) throw new Error("Globe land is unavailable");
  const topology: LandTopology = await response.json();

  // Rasterize the existing land polygons once, then sample them on the sphere.
  const mask = document.createElement("canvas");
  mask.width = 720;
  mask.height = 360;
  const context = mask.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  const { scale, translate } = topology.transform;
  const arcs = topology.arcs.map((arc) => {
    let longitude = 0;
    let latitude = 0;
    return arc.map(([dx, dy]) => {
      longitude += dx;
      latitude += dy;
      return [
        (longitude * scale[0] + translate[0] + 180) * 2,
        (90 - latitude * scale[1] - translate[1]) * 2,
      ];
    });
  });

  for (const { arcs: polygons } of topology.objects.land.geometries) {
    for (const polygon of polygons) {
      context.beginPath();
      for (const ring of polygon) {
        let first = true;
        for (const index of ring) {
          const arc = index >= 0 ? arcs[index] : [...arcs[~index]].reverse();
          for (const [x, y] of arc) {
            if (first) context.moveTo(x, y);
            else context.lineTo(x, y);
            first = false;
          }
        }
        context.closePath();
      }
      context.fill("evenodd");
    }
  }

  const { data } = context.getImageData(0, 0, mask.width, mask.height);
  const land: GlobePoint[] = [];
  for (let latitude = -87; latitude < 90; latitude += 1.85) {
    const count = Math.max(1, Math.round(194 * Math.cos(latitude * DEG)));
    for (let index = 0; index < count; index++) {
      const longitude = -180 + ((index + 0.5) * 360) / count;
      const x = Math.floor((longitude + 180) * 2);
      const y = Math.floor((90 - latitude) * 2);
      if (data[(y * mask.width + x) * 4 + 3] > 127) {
        land.push(globePoint(longitude, latitude));
      }
    }
  }
  return land;
}

const GRID = [
  ...Array.from({ length: 11 }, (_, index) =>
    Array.from({ length: 121 }, (_, step) =>
      globePoint(step * 3, (index - 5) * 15),
    ),
  ),
  ...Array.from({ length: 12 }, (_, index) =>
    Array.from({ length: 121 }, (_, step) =>
      globePoint(index * 15, step * 3 - 90),
    ),
  ),
];

export function makeFlight(nodes: readonly GlobePoint[], start: number) {
  const source = Math.floor(Math.random() * nodes.length);
  const offset = 1 + Math.floor(Math.random() * (nodes.length - 1));
  const from = nodes[source];
  const to = nodes[(source + offset) % nodes.length];
  const angle = Math.acos(
    Math.max(
      -1,
      Math.min(1, from[0] * to[0] + from[1] * to[1] + from[2] * to[2]),
    ),
  );
  const lift = 0.16 + (0.24 * angle) / Math.PI;

  const points = Array.from({ length: 81 }, (_, index): GlobePoint => {
    const t = index / 80;
    const radius = 1.01 + lift * Math.sin(Math.PI * t);
    const a = (radius * Math.sin(angle * (1 - t))) / Math.sin(angle);
    const b = (radius * Math.sin(angle * t)) / Math.sin(angle);
    return [
      from[0] * a + to[0] * b,
      from[1] * a + to[1] * b,
      from[2] * a + to[2] * b,
    ];
  });

  return { points, start, duration: 1650 + angle * 550 };
}

function starBandHeight(x: number) {
  return 0.72 - x * 0.55 + 0.035 * Math.sin(x * 11);
}

// Cache the dense star field and gas clouds between resizes.
export function paintDeepSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  let seed = 8472;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.save();
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0, 0, w, h);
  // Overlapping gas clouds leave dark lanes through the middle of the stellar band.
  for (let i = 0; i < 64; i++) {
    const x = random();
    const y = starBandHeight(x) + (random() - 0.5) * 0.17;
    const radius = Math.min(w, h) * (0.04 + random() * 0.17);
    const gas = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, radius);
    gas.addColorStop(0, i % 3 ? "#627a9814" : "#bc754e19");
    gas.addColorStop(0.45, i % 3 ? "#495c7710" : "#9860400c");
    gas.addColorStop(1, "#00000000");
    ctx.fillStyle = gas;
    ctx.fillRect(x * w - radius, y * h - radius, radius * 2, radius * 2);
  }
  for (let i = 0; i < 5100; i++) {
    const x = random();
    const spread = random() + random() + random() - 1.5;
    const y = i % 4 ? starBandHeight(x) + spread * 0.19 : random();
    const size = 0.33 + random() ** 5 * 1.15;
    ctx.globalAlpha = (0.15 + random() * 0.58) * (Math.abs(spread) < 0.1 ? 0.35 : 1);
    ctx.fillStyle = i % 3 ? "#c6cfd4" : "#f3cea3";
    ctx.fillRect(x*w, y*h, size, size);
  }
  ctx.globalAlpha = 1;
  const exposure = ctx.createLinearGradient(0, 0, w, h * 0.45);
  exposure.addColorStop(0, "#05070bba");
  exposure.addColorStop(0.45, "#05070b24");
  exposure.addColorStop(1, "#05070b00");
  ctx.fillStyle = exposure;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintDistantParticles(ctx: CanvasRenderingContext2D, w: number, h: number, seconds: number) {
  const count = w < 760 ? 8 : 14;
  const span = Math.min(w, h);
  ctx.lineCap = "round";
  ctx.lineWidth = 0.75;
  for (let i = 0; i < count; i++) {
    const direction = i % 2 ? 1 : -1;
    const phase = i * 2.39996 + seconds * direction * (0.3 + i % 5 * 0.055);
    const radius = span * (0.045 + i % 6 * 0.013);
    const cx = w * (0.08 + ((i * 0.61803398875) % 1) * 0.84);
    const cy = h * (0.13 + ((i * 0.41421356237) % 1) * 0.74);
    const x = cx + Math.cos(phase) * radius;
    const y = cy + Math.sin(phase) * radius * 0.48;
    const pulse = (0.5 + 0.5 * Math.sin(seconds * 0.87 + i * 1.77)) ** 3;
    const tailPhase = phase - direction * (0.11 + pulse * 0.15);
    const tailX = cx + Math.cos(tailPhase) * radius;
    const tailY = cy + Math.sin(tailPhase) * radius * 0.48;
    const cool = i % 4 === 0;
    const trail = ctx.createLinearGradient(tailX, tailY, x, y);
    trail.addColorStop(0, cool ? "#a1bdcf00" : "#e0b68600");
    trail.addColorStop(1, cool ? "#a1bdcf" : "#e0b686");
    ctx.globalAlpha = 0.2 + pulse * 0.38;
    ctx.strokeStyle = trail;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = cool ? "#b8d1db" : "#ecd1ad";
    ctx.fillRect(x - 0.45, y - 0.45, 0.9, 0.9);
  }
}

function paintSkyMotion(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const seconds = time / 1000;
  ctx.save();
  ctx.fillStyle = "#f3d8b8";
  for (let i = 0; i < 64; i++) {
    const x = ((i * 0.61803398875 + 0.17) % 1) * w;
    const y = ((i * 0.41421356237 + 0.31) % 1) * h;
    const pulse = 0.5 + 0.5 * Math.sin(seconds * (0.72 + i % 7 * 0.22) + i);
    const brightness = pulse ** 6;
    const flare = i % 9 === 0;
    const size = flare ? 1.7 : 1.1;
    ctx.globalAlpha = 0.12 + 0.77 * brightness;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    if (flare) {
      const ray = 2 + brightness * 4;
      ctx.globalAlpha = brightness * 0.43;
      ctx.fillRect(x - ray, y - 0.35, ray * 2, 0.7);
      ctx.fillRect(x - 0.35, y - ray, 0.7, ray * 2);
    }
  }
  for (let i = 0; i < 38; i++) {
    const x = (i * 0.754877666 + seconds * (0.004 + i % 3 * 0.001)) % 1;
    const y = starBandHeight(x) + 0.15 * Math.sin(i * 2.4);
    ctx.globalAlpha = Math.sin(x * Math.PI) * (0.14 + i % 4 * 0.08);
    ctx.fillRect(x * w, y * h, 1.4 + i % 3 * 0.45, 1);
  }
  paintDistantParticles(ctx, w, h, seconds);
  ctx.restore();
}

export function globeRadius(width: number, height: number, zoom: number) {
  return Math.min(width, height) * 0.351 * zoom;
}

// Pitch and roll define one fixed north–south axis. Yaw spins around it.
const cosPitch = Math.cos(0.12);
const sinPitch = Math.sin(0.12);
const cosRoll = Math.cos(-0.16);
const sinRoll = Math.sin(-0.16);

export function globeProjection(yaw: number) {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);

  return ([x, y, z]: GlobePoint) => {
    const horizontal = x * cosYaw + z * sinYaw;
    const depth = z * cosYaw - x * sinYaw;
    const vertical = y * cosPitch - depth * sinPitch;
    return {
      x: horizontal * cosRoll - vertical * sinRoll,
      y: horizontal * sinRoll + vertical * cosRoll,
      z: y * sinPitch + depth * cosPitch,
    };
  };
}

type Flight = ReturnType<typeof makeFlight>;
export function paintGlobe(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  yaw: number,
  land: readonly GlobePoint[],
  flights: readonly Flight[],
  time: number,
  staticTrails: boolean,
  zoom = 1,
  centerY = 0.51,
  paintBackdropMotion?: () => void,
) {
  const cx = width / 2;
  const cy = height * centerY;
  const radius = globeRadius(width, height, zoom);
  const project = globeProjection(yaw);

  context.clearRect(0, 0, width, height);
  paintBackdropMotion?.();
  if (!staticTrails) paintSkyMotion(context, width, height, time);

  const ocean = context.createRadialGradient(
    cx + radius * 0.78,
    cy - radius * 0.69,
    0,
    cx + radius * 0.45,
    cy - radius * 0.34,
    radius * 1.57,
  );
  ocean.addColorStop(0, "#886245");
  ocean.addColorStop(0.51, "#30251f");
  ocean.addColorStop(0.82, "#0f0e11");
  ocean.addColorStop(1, "#0a0b0e");
  context.beginPath();
  context.arc(cx, cy, radius, 0, TAU);
  context.fillStyle = ocean;
  context.fill();

  context.save();
  context.clip();
  context.beginPath();
  for (const line of GRID) {
    let visible = false;
    for (const point of line) {
      const { x, y, z } = project(point);
      if (z >= 0) {
        if (visible) context.lineTo(cx + x * radius, cy - y * radius);
        else context.moveTo(cx + x * radius, cy - y * radius);
      }
      visible = z >= 0;
    }
  }
  context.lineWidth = 0.6;
  context.strokeStyle = "rgba(237, 186, 127, .20)";
  context.stroke();

  context.restore();

  const sweep = time * 0.00032;
  const waveX = Math.sin(sweep);
  const waveZ = Math.cos(sweep);
  for (const point of land) {
    const { x, y, z } = project(point);
    if (z <= 0) continue;
    const light = Math.max(0, Math.min(1, 0.30 + x * 0.56 + y * 0.44 + z * 0.13));
    const size = radius * (0.006 + z * 0.003);
    const waveDistance = point[0] * waveX + point[2] * waveZ + point[1] * 0.38;
    const wave = staticTrails ? 0 : Math.exp(-((waveDistance / 0.16) ** 2));
    const landRadius = radius * (1 + wave * 0.085);
    const opacity =
      Math.min(1, 0.23 + light * 0.55 + wave * 0.54) * Math.min(1, z * 3.5);
    context.fillStyle = `rgba(242, ${185 + Math.round(wave * 31)}, ${119 + Math.round(wave * 59)}, ${opacity})`;
    context.fillRect(
      cx + x * landRadius - size / 2,
      cy - y * landRadius - size / 2,
      size,
      size,
    );
  }

  const rim = context.createLinearGradient(
    cx + radius,
    cy - radius,
    cx - radius,
    cy + radius,
  );
  rim.addColorStop(0, "#ffe4ba");
  rim.addColorStop(0.36, "#ae794a");
  rim.addColorStop(0.74, "#4c3330");
  rim.addColorStop(1, "#252122");
  context.beginPath();
  context.arc(cx, cy, radius, 0, TAU);
  context.strokeStyle = rim;
  context.lineWidth = 1.4;
  context.stroke();

  context.lineCap = "round";
  for (const flight of flights) {
    if (time < flight.start && !staticTrails) continue;
    const progress = staticTrails ? 1 : (time - flight.start) / flight.duration;
    const head = Math.min(80, Math.floor(progress * 80));
    const tail = staticTrails ? 0 : Math.max(0, Math.floor(progress * 80) - 23);
    let previous = project(flight.points[Math.min(tail, 80)]);
    for (let index = tail + 1; index <= head; index++) {
      const point = project(flight.points[index]);
      const visible = point.z >= 0 || point.x ** 2 + point.y ** 2 > 1;
      const previousVisible =
        previous.z >= 0 || previous.x ** 2 + previous.y ** 2 > 1;
      if (visible && previousVisible) {
        const strength = staticTrails
          ? 0.25
          : (index - tail) / Math.max(1, head - tail);
        context.beginPath();
        context.moveTo(cx + previous.x * radius, cy - previous.y * radius);
        context.lineTo(cx + point.x * radius, cy - point.y * radius);
        context.strokeStyle = `rgba(255, 208, 147, ${strength * 0.95})`;
        context.lineWidth = 1.5;
        context.stroke();
        if (!staticTrails && index === head && progress <= 1) {
          context.beginPath();
          context.arc(
            cx + point.x * radius,
            cy - point.y * radius,
            2.7,
            0,
            TAU,
          );
          context.fillStyle = "#fff3ce";
          context.fill();
        }
      }
      previous = point;
    }
  }

  return { project, cx, cy, radius };
}
