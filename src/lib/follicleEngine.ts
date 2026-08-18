// GroomAI Follicle Engine v3 - clumped, lighting-aware, direct-to-face hair synthesis.

export type BeardStyleId = 'stubble' | 'boxed' | 'full' | 'goatee';

type P = { x: number; y: number };

interface Cfg { strands: number; lenMin: number; lenMax: number; cheekFade: number; chinBoost: number; under: number }
const CFG: Record<BeardStyleId, Cfg> = {
  stubble: { strands: 2600, lenMin: 2, lenMax: 6, cheekFade: 1, chinBoost: 0.3, under: 0.16 },
  boxed: { strands: 4800, lenMin: 6, lenMax: 14, cheekFade: 0.85, chinBoost: 0.5, under: 0.24 },
  full: { strands: 7000, lenMin: 10, lenMax: 26, cheekFade: 0.65, chinBoost: 0.9, under: 0.3 },
  goatee: { strands: 3000, lenMin: 6, lenMax: 16, cheekFade: 0.4, chinBoost: 1, under: 0.26 },
};

const noise = (x: number, y: number) => Math.sin(x * 12.9898 + y * 78.233) * 0.5 + Math.sin(x * 4.1414 + y * 43.21) * 0.5;
const quad = (a: P, m: P, b: P, t: number): P => {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * m.x + t * t * b.x, y: u * u * a.y + 2 * u * t * m.y + t * t * b.y };
};
const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export function renderBeard(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  pts: any[],
  style: BeardStyleId,
  L: number,
  D: number,
  color: { r: number; g: number; b: number },
  lum: { data: Uint8ClampedArray; w: number; h: number } | null
) {
  const c = CFG[style];
  const faceH = Math.hypot(pts[8].x - pts[27].x, pts[8].y - pts[27].y);
  const bc = { r: color.r * 0.7, g: color.g * 0.7, b: color.b * 0.7 };

  const jawAt = (t: number): P => {
    const idx = t * 16;
    const i = Math.floor(idx);
    const f = idx - i;
    const a = pts[i];
    const b = pts[Math.min(i + 1, 16)];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  const cornerL = { x: pts[48].x - faceH * 0.06, y: pts[48].y - faceH * 0.04 };
  const cornerR = { x: pts[54].x + faceH * 0.06, y: pts[54].y - faceH * 0.04 };
  const underMouth = { x: pts[57].x, y: pts[57].y + faceH * 0.04 };
  const innerAt = (t: number): P => (t <= 0.5 ? quad(pts[2], cornerL, underMouth, t * 2) : quad(underMouth, cornerR, pts[14], (t - 0.5) * 2));
  const outerAt = (t: number): P => {
    const j = jawAt(t);
    return { x: j.x + (j.x - pts[8].x) * 0.1, y: j.y + (0.02 + 0.05 * Math.sin(t * Math.PI)) * faceH };
  };

  const lumAt = (x: number, y: number) => {
    if (!lum) return 128;
    const lx = Math.min(lum.w - 1, Math.max(0, Math.floor((x / canvas.width) * lum.w)));
    const ly = Math.min(lum.h - 1, Math.max(0, Math.floor((y / canvas.height) * lum.h)));
    return lum.data[(ly * lum.w + lx) * 4];
  };

  const tRange: [number, number] = style === 'goatee' ? [0.3, 0.7] : [0, 1];

  // --- Under-shadow: beard reads as darkened skin depth ---
  ctx.save();
  ctx.beginPath();
  const i0 = innerAt(tRange[0]);
  ctx.moveTo(i0.x, i0.y);
  for (let i = 1; i <= 20; i++) { const p = innerAt(tRange[0] + (tRange[1] - tRange[0]) * (i / 20)); ctx.lineTo(p.x, p.y); }
  for (let i = 20; i >= 0; i--) { const p = outerAt(tRange[0] + (tRange[1] - tRange[0]) * (i / 20)); ctx.lineTo(p.x, p.y); }
  ctx.closePath();
  ctx.filter = 'blur(6px)';
  ctx.fillStyle = `rgba(15,10,7,${c.under * D})`;
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();

  // --- Clumped follicle bundles ---
  ctx.save();
  ctx.lineCap = 'round';
  const clusters = Math.floor((c.strands * D) / 14);
  for (let cl = 0; cl < clusters; cl++) {
    const ct = tRange[0] + Math.random() * (tRange[1] - tRange[0]);
    const cs = Math.pow(Math.random(), 0.7);
    const base = innerAt(ct);
    const out = outerAt(ct);
    const cx0 = base.x + (out.x - base.x) * cs;
    const cy0 = base.y + (out.y - base.y) * cs;
    const clAng = (Math.random() - 0.5) * 0.5;
    const clLen = 0.8 + Math.random() * 0.5;
    const clVar = (Math.random() - 0.5) * 36;

    for (let sIdx = 0; sIdx < 14; sIdx++) {
      const x = cx0 + (Math.random() - 0.5) * faceH * 0.03;
      const y = cy0 + (Math.random() - 0.5) * faceH * 0.03;
      const edgeIn = Math.min(1, cs * 3.5) * (0.4 + 0.6 * c.cheekFade);
      const edgeOut = Math.min(1, (1 - cs) * 5 + 0.35);
      const alpha = (0.5 + Math.random() * 0.4) * edgeIn * edgeOut;
      if (alpha < 0.06) continue;
      const outward = Math.atan2(out.y - base.y, out.x - base.x);
      const flow = (Math.PI / 2) * 0.75 + outward * 0.25 + clAng + noise(x * 0.05, y * 0.05) * 0.25;
      const len = (c.lenMin + (c.lenMax - c.lenMin) * cs) * (1 + c.chinBoost * Math.sin(ct * Math.PI)) * L * clLen * (0.7 + Math.random() * 0.6);
      const light = 0.55 + (lumAt(x, y) / 255) * 0.9;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `rgb(${clamp255(bc.r * light + clVar)},${clamp255(bc.g * light + clVar)},${clamp255(bc.b * light + clVar)})`;
      ctx.lineWidth = 0.7 + Math.random() * 0.9;
      const ex = x + Math.cos(flow) * len;
      const ey = y + Math.sin(flow) * len;
      const mx = x + Math.cos(flow + clAng * 0.5) * len * 0.5;
      const my = y + Math.sin(flow + clAng * 0.5) * len * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
    }
  }

  // --- Mustache: clumps flowing down-out from philtrum ---
  const mTop = pts[33].y + (pts[51].y - pts[33].y) * 0.3;
  const lipY = pts[51].y;
  const mClusters = Math.floor((500 * D) / 10);
  for (let cl = 0; cl < mClusters; cl++) {
    const t = Math.random();
    const cx0 = pts[48].x + (pts[54].x - pts[48].x) * t;
    const cy0 = mTop + Math.random() * Math.max(2, lipY - mTop);
    const clVar = (Math.random() - 0.5) * 30;
    for (let sIdx = 0; sIdx < 10; sIdx++) {
      const x = cx0 + (Math.random() - 0.5) * faceH * 0.02;
      const y = cy0 + (Math.random() - 0.5) * faceH * 0.015;
      const dir = (t - 0.5) * 1.3 + (Math.random() - 0.5) * 0.3;
      const ang = Math.PI / 2 + dir;
      const len = faceH * (0.02 + Math.random() * 0.04) * L;
      const light = 0.55 + (lumAt(x, y) / 255) * 0.9;
      ctx.globalAlpha = 0.4 + Math.random() * 0.4;
      ctx.strokeStyle = `rgb(${clamp255(bc.r * light + clVar)},${clamp255(bc.g * light + clVar)},${clamp255(bc.b * light + clVar)})`;
      ctx.lineWidth = 0.7 + Math.random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
