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
  [0.3, 0.55], [0.33, 0.63], [0.37, 0.7], [0.42, 0.745], [0.46, 0.76],
  [0.5, 0.765], [0.54, 0.76], [0.58, 0.745], [0.63, 0.7], [0.67, 0.63], [0.7, 0.55],
];
const MUST_OUT_T: [number, number][] = [[0.4, 0.635], [0.45, 0.615], [0.5, 0.61], [0.55, 0.615], [0.6, 0.635]];
const MUST_IN_T: [number, number][] = [[0.42, 0.665], [0.46, 0.655], [0.5, 0.652], [0.54, 0.655], [0.58, 0.665]];

const OUTER_T: [number, number][] = JAW_T.map(([x, y], i) => {
  const t = i / (JAW_T.length - 1);
  return [x + (x - 0.5) * 0.12, y + 0.03 + 0.06 * Math.sin(t * Math.PI)];
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

export function warpBeard(ctx: CanvasRenderingContext2D, style: BeardStyleId, pts: any[]) {
  const tex = getBeardTexture(style);
  const S = tex.width;
  const faceH = Math.hypot(pts[8].x - pts[27].x, pts[8].y - pts[27].y);

  // --- User-space curves from 68 landmarks ---
  const jawAt = (t: number): P => {
    const idx = t * 16;
    const i = Math.floor(idx);
    const f = idx - i;
    const a = pts[i];
    const b = pts[Math.min(i + 1, 16)];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  const U_JAW = Array.from({ length: 11 }, (_, i) => jawAt(i / 10));
  const U_OUTER = U_JAW.map((p, i) => {
    const t = i / 10;
    return { x: p.x + (p.x - pts[8].x) * 0.12, y: p.y + (0.03 + 0.06 * Math.sin(t * Math.PI)) * faceH };
  });

  const innerL = { x: (pts[2].x + pts[48].x) / 2, y: (pts[2].y + pts[48].y) / 2 };
  const innerR = { x: (pts[14].x + pts[54].x) / 2, y: (pts[14].y + pts[54].y) / 2 };
  const underMouth = { x: pts[57].x, y: pts[57].y + faceH * 0.05 };
  const U_INNER = Array.from({ length: 11 }, (_, i) => quad(innerL, underMouth, innerR, i / 10));

  const mOutL = { x: pts[48].x, y: pts[48].y - faceH * 0.06 };
  const mOutR = { x: pts[54].x, y: pts[54].y - faceH * 0.06 };
  const philtrum = { x: pts[33].x, y: pts[33].y + faceH * 0.04 };
  const U_MOUT = Array.from({ length: 5 }, (_, i) => quad(mOutL, philtrum, mOutR, i / 4));

  const mInL = { x: pts[48].x, y: pts[48].y + faceH * 0.01 };
  const mInR = { x: pts[54].x, y: pts[54].y + faceH * 0.01 };
  const lipMid = { x: pts[51].x, y: pts[51].y + faceH * 0.02 };
  const U_MIN = Array.from({ length: 5 }, (_, i) => quad(mInL, lipMid, mInR, i / 4));

  // --- Triangle strips: [templateA, templateB, userA, userB] ---
  const strips: [ [number, number][], [number, number][], P[], P[] ][] = [
    [INNER_T, JAW_T, U_INNER, U_JAW],
    [JAW_T, OUTER_T, U_JAW, U_OUTER],
    [MUST_OUT_T, MUST_IN_T, U_MOUT, U_MIN],
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
  ctx.restore();
}
