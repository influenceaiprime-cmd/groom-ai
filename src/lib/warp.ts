// GroomAI Premium Engine - Step 2: triangle mesh warp mapper.
// Maps the normalized template fur texture onto the user's 68-landmark face
// using piecewise affine transforms (the standard web-AR technique).

import { getBeardTexture, type BeardStyleId } from './furTexture';

type P = { x: number; y: number };

const JAW_T: [number, number][] = [
  [0.16, 0.46], [0.175, 0.58], [0.21, 0.7], [0.28, 0.8], [0.38, 0.875],
  [0.5, 0.91], [0.62, 0.875], [0.72, 0.8], [0.79, 0.7], [0.825, 0.58], [0.84, 0.46],
];
const INNER_T: [number, number][] = [
  [0.21, 0.7], [0.26, 0.67], [0.32, 0.645], [0.38, 0.64], [0.44, 0.665],
  [0.5, 0.72], [0.56, 0.665], [0.62, 0.64], [0.68, 0.645], [0.74, 0.67], [0.79, 0.7],
];

const OUTER_T: [number, number][] = JAW_T.map(([x, y], i) => {
  const t = i / (JAW_T.length - 1);
  return [x + (x - 0.5) * 0.1, y + 0.02 + 0.05 * Math.sin(t * Math.PI)];
});

const quad = (a: P, m: P, b: P, t: number): P => {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * m.x + t * t * b.x, y: u * u * a.y + 2 * u * t * m.y + t * t * b.y };
};

function drawTri(
  ctx: CanvasRenderingContext2D,
  tex: HTMLCanvasElement,
  d0: P, d1: P, d2: P,
  s0: P, s1: P, s2: P
) {
  const cx = (d0.x + d1.x + d2.x) / 3;
  const cy = (d0.y + d1.y + d2.y) / 3;
  const g = (p: P): P => ({ x: cx + (p.x - cx) * 1.06, y: cy + (p.y - cy) * 1.06 });
  const a0 = g(d0), a1 = g(d1), a2 = g(d2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(a0.x, a0.y);
  ctx.lineTo(a1.x, a1.y);
  ctx.lineTo(a2.x, a2.y);
  ctx.closePath();
  ctx.clip();

  const u0 = s0.x, v0 = s0.y, u1 = s1.x, v1 = s1.y, u2 = s2.x, v2 = s2.y;
  const den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
  if (Math.abs(den) < 1e-6) { ctx.restore(); return; }
  const a = ((a1.x - a0.x) * (v2 - v0) - (a2.x - a0.x) * (v1 - v0)) / den;
  const b = ((a1.y - a0.y) * (v2 - v0) - (a2.y - a0.y) * (v1 - v0)) / den;
  const c = ((a2.x - a0.x) * (u1 - u0) - (a1.x - a0.x) * (u2 - u0)) / den;
  const d = ((a2.y - a0.y) * (u1 - u0) - (a1.y - a0.y) * (u2 - u0)) / den;
  const e = a0.x - a * u0 - c * v0;
  const f = a0.y - b * u0 - d * v0;
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(tex, 0, 0);
  ctx.restore();
}

export function warpBeard(ctx: CanvasRenderingContext2D, style: BeardStyleId, pts: any[], color?: { r: number; g: number; b: number }) {
  const tex = getBeardTexture(style);
  const S = tex.width;
  const faceH = Math.hypot(pts[8].x - pts[27].x, pts[8].y - pts[27].y);

  // --- User jaw curve from 68 landmarks ---
  const jawAt = (t: number): P => {
    const idx = t * 16;
    const i = Math.floor(idx);
    const f = idx - i;
    const a = pts[i];
    const b = pts[Math.min(i + 1, 16)];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  const U_JAW = Array.from({ length: 11 }, (_, i) => jawAt(i / 10));

  // --- Natural cheek line: sideburn -> under-mouth -> sideburn ---
  const cornerL = { x: pts[48].x - faceH * 0.07, y: pts[48].y - faceH * 0.05 };
  const cornerR = { x: pts[54].x + faceH * 0.07, y: pts[54].y - faceH * 0.05 };
  const underMouth = { x: pts[57].x, y: pts[57].y + faceH * 0.04 };
  const left = Array.from({ length: 6 }, (_, i) => quad(pts[0], cornerL, underMouth, i / 5));
  const right = Array.from({ length: 5 }, (_, i) => quad(underMouth, cornerR, pts[16], (i + 1) / 5));
  const U_INNER = [...left, ...right];

  // --- Outer silhouette: jaw pushed slightly outward/down ---
  const U_OUTER = U_JAW.map((p, i) => {
    const t = i / 10;
    return { x: p.x + (p.x - pts[8].x) * 0.1, y: p.y + (0.02 + 0.05 * Math.sin(t * Math.PI)) * faceH };
  });


  const strips: [ [number, number][], [number, number][], P[], P[] ][] = [
    [INNER_T, JAW_T, U_INNER, U_JAW],
    [JAW_T, OUTER_T, U_JAW, U_OUTER],
  ];

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  for (const [ta, tb, ua, ub] of strips) {
    const n = ta.length - 1;
    for (let i = 0; i < n; i++) {
      const t = (p: [number, number]): P => ({ x: p[0] * S, y: p[1] * S });
      drawTri(ctx, tex, ua[i], ub[i], ub[i + 1], t(ta[i]), t(tb[i]), t(tb[i + 1]));
      drawTri(ctx, tex, ua[i], ub[i + 1], ua[i + 1], t(ta[i]), t(tb[i + 1]), t(ta[i + 1]));
    }
  }
  const mc = color || { r: 40, g: 30, b: 22 };
  const mTopY = pts[33].y + (pts[51].y - pts[33].y) * 0.35;
  const lipY = pts[51].y;
  ctx.lineCap = "round";
  for (let i = 0; i < 350; i++) {
    const t = Math.random();
    const x = pts[48].x + (pts[54].x - pts[48].x) * t;
    const y = mTopY + Math.random() * Math.max(2, lipY - mTopY + faceH * 0.01);
    const dir = (t - 0.5) * 1.2;
    const len = faceH * (0.02 + Math.random() * 0.03);
    const ang = Math.PI / 2 + dir;
    ctx.globalAlpha = 0.35 + Math.random() * 0.4;
    ctx.strokeStyle = `rgb(${mc.r},${mc.g},${mc.b})`;
    ctx.lineWidth = 0.8 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
