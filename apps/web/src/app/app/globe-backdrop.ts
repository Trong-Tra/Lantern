import { paintDeepSky } from "./globe-scene";

const turn = Math.PI * 2;

export function diskGeometry(width: number, height: number) {
  const compact = width < 600;
  return {
    x: width * (compact ? 0.82 : 0.78),
    y: height * (compact ? 0.29 : 0.37),
    radius: Math.min(width, height) * (compact ? 0.128 : 0.158),
    tilt: -0.22,
  };
}

export function paintBlackHoleBurst(ctx: CanvasRenderingContext2D, width: number, height: number, age: number) {
  const gatherDuration = 1250;
  const releaseAt = gatherDuration + 110;
  const releaseDuration = 850;
  if (age < 0 || age >= releaseAt + releaseDuration) return;

  const { x, y, radius, tilt } = diskGeometry(width, height);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.lineCap = "round";

  for (let i = 0; i < 58; i++) {
    const start = (i % 9) * 55;
    const arrival = gatherDuration - (i % 7) * 48;
    const progress = (age - start) / (arrival - start);
    if (progress <= 0 || progress >= 1) continue;

    const distance = radius * (0.92 + (1 - progress ** 2) * (1.5 + (i % 13) * 0.23));
    const angle = i * 2.39996 + progress * (1.9 + 1.7 * progress);
    const flattening = 0.76 - progress * 0.52;
    const headX = Math.cos(angle) * distance;
    const headY = Math.sin(angle) * distance * flattening;
    if (Math.hypot(headX, headY) < radius * 0.9) continue;

    const trail = angle - 0.035 - progress * 0.06;
    const tail = distance + radius * (0.03 + progress * 0.11);
    ctx.globalAlpha = Math.min(progress * 7, 1) * Math.min((1 - progress) * 5, 1);
    ctx.strokeStyle = i % 4 === 0 ? "#ffe7bf" : "#e9a174";
    ctx.lineWidth = i % 4 === 0 ? 1.65 : 0.85;
    ctx.beginPath();
    ctx.moveTo(Math.cos(trail) * tail, Math.sin(trail) * tail * (flattening + 0.02));
    ctx.lineTo(headX, headY);
    ctx.stroke();
  }

  const releaseAge = age - releaseAt;
  const charge = Math.min(age / gatherDuration, 1);
  const settle = Math.min(Math.max(releaseAt - age, 0) / (releaseAt - gatherDuration), 1);
  ctx.globalAlpha = 0.65 * charge ** 3 * settle;
  ctx.strokeStyle = "#ffc38e";
  ctx.shadowColor = "#ffa466";
  ctx.shadowBlur = 12;
  ctx.lineWidth = Math.max(1, radius * 0.029);
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.04, radius * 1.08, radius * 0.21, 0, 0, Math.PI);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (releaseAge > 0) {
    const travel = Math.min(releaseAge / 160, 1);
    const fade = 1 - releaseAge / releaseDuration;
    const length = radius * 4.5 * travel * travel * (3 - 2 * travel);
    const spread = radius * (0.4 - fade * 0.14);
    ctx.globalAlpha = Math.min(releaseAge / 65, 1) * fade ** 2;
    for (const direction of [-1, 1]) {
      ctx.save();
      ctx.translate(0, direction * radius * 0.87);
      ctx.scale(spread, direction * length);
      // Paint the whole plume with one continuous falloff across and along the jet.
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      glow.addColorStop(0, "#ffbd89");
      glow.addColorStop(0.26, "#f6a56dcc");
      glow.addColorStop(0.62, "#e9875659");
      glow.addColorStop(1, "#e9875600");
      ctx.fillStyle = glow;
      ctx.fillRect(-1, 0, 2, 1);
      ctx.restore();
    }
  }

  ctx.restore();
}

export function paintGlobeBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number) {
  paintDeepSky(ctx, width, height);
  const { x, y, radius, tilt } = diskGeometry(width, height);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  ctx.save();
  ctx.scale(1, 0.26);
  const dust = ctx.createRadialGradient(0, 0, radius * 0.67, 0, 0, radius * 2.5);
  dust.addColorStop(0, "#dc855800");
  dust.addColorStop(0.18, "#d0875c50");
  dust.addColorStop(0.52, "#a45d3530");
  dust.addColorStop(1, "#a45d3500");
  ctx.fillStyle = dust;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.5, 0, turn);
  ctx.fill();
  ctx.restore();

  const edge = ctx.createLinearGradient(-radius, radius, radius, -radius);
  edge.addColorStop(0, "#512d24");
  edge.addColorStop(0.37, "#ba6a43");
  edge.addColorStop(0.71, "#f3b477");
  edge.addColorStop(1, "#78432f");
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.89, 0, turn);
  ctx.fillStyle = "#040408";
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1, radius * 0.038);
  ctx.shadowColor = "#c3714b";
  ctx.shadowBlur = radius * 0.13;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = edge;
  for (let ring = 0; ring < 32; ring++) {
    const major = radius * (0.91 + ring * 0.045);
    ctx.globalAlpha = (1 - ring / 32) * (0.12 + (ring % 5) * 0.067);
    ctx.lineWidth = 0.65 + (ring % 4) * 0.29;
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.04, major, major * 0.24, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

export function paintAccretion(ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number) {
  const { x, y, radius, tilt } = diskGeometry(width, height);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.lineCap = "round";
  for (let i = 0; i < 22; i++) {
    const major = radius * (0.94 + (i % 11) * 0.1);
    const phase = (i * 2.39996 + elapsed * (0.00017 + i % 5 * 0.000019)) % turn;
    if (phase < Math.PI + 0.32 && phase > Math.PI - 0.22) continue;
    const end = Math.min(phase + 0.07 + i % 4 * 0.03, phase < Math.PI ? Math.PI : turn);
    if (phase > Math.PI && Math.abs(Math.cos(phase)) * major < radius * 0.92) continue;
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.04, major, major * 0.24, 0, phase, end);
    ctx.lineWidth = i % 5 === 0 ? 1.35 : 0.7;
    ctx.strokeStyle = i % 3 ? "#e6a573" : "#ffd1a2";
    ctx.globalAlpha = 0.14 + 0.32 * (0.5 + 0.5 * Math.sin(phase * 2 + i));
    ctx.stroke();
  }
  ctx.restore();
}
