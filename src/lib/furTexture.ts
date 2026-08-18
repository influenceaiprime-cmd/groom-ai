// GroomAI Premium Engine - Step 1: high-density fur texture pre-renderer.
// Renders ultra-dense beard textures on a normalized template face (1024px),
// cached once per style, later warped onto the user's face via mesh mapping.

export type BeardStyleId = 'stubble' | 'boxed' | 'full' | 'goatee';

const cache = new Map<string, HTMLCanvasElement>();

// Normalized template geometry (x,y in 0..1)
const JAW: [number, number][] = [
  [0.16, 0.46], [0.175, 0.58], [0.21, 0.7], [0.28, 0.8], [0.38, 0.875],
  [0.5, 0.91], [0.62, 0.875], [0.72, 0.8], [0.79, 0.7], [0.825, 0.58], [0.84, 0.46],
];
const INNER: [number, number][] = [
  [0.3, 0.55], [0.33, 0.63], [0.37, 0.7], [0.42, 0.745], [0.46, 0.76],
  [0.5, 0.765], [0.54, 0.76], [0.58, 0.745], [0.63, 0.7], [0.67, 0.63], [0.7, 0.55],
];
const MUST_OUT: [number, number][] = [[0.4, 0.635], [0.45, 0.615], [0.5, 0.61], [0.55, 0.615], [0.6, 0.635]];
const MUST_IN: [number, number][] = [[0.42, 0.665], [0.46, 0.655], [0.5, 0.652], [0.54, 0.655], [0.58, 0.665]];

function curveAt(pts: [number, number][], t: number) {
  const idx = t * (pts.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  const a = pts[Math.min(i, pts.length - 1)];
  const b = pts[Math.min(i + 1, pts.length - 1)];
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f };
}

const noise = (x: number, y: number) =>
  Math.sin(x * 12.9898 + y * 78.233) * 0.5 + Math.sin(x * 4.1414 + y * 43.21) * 0.5;

interface StyleCfg { strands: number; lenMin: number; lenMax: number; fade: number; mustache: boolean; chinDrop: number; tRange: [number, number] }
const CFG: Record<BeardStyleId, StyleCfg> = {
  stubble: { strands: 26000, lenMin: 3, lenMax: 7, fade: 0.9, mustache: true, chinDrop: 0, tRange: [0, 1] },
  boxed: { strands: 42000, lenMin: 8, lenMax: 16, fade: 0.6, mustache: true, chinDrop: 0.02, tRange: [0, 1] },
  full: { strands: 60000, lenMin: 14, lenMax: 30, fade: 0.35, mustache: true, chinDrop: 0.08, tRange: [0, 1] },
  goatee: { strands: 18000, lenMin: 8, lenMax: 16, fade: 0.5, mustache: true, chinDrop: 0.03, tRange: [0.28, 0.72] },
};

export function getBeardTexture(style: BeardStyleId): HTMLCanvasElement {
  const hit = cache.get(style);
  if (hit) return hit;

  const S = 1024;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  const c = CFG[style];
  ctx.lineCap = 'round';

  // --- Main beard mass: density-gradient fur field ---
  for (let i = 0; i < c.strands; i++) {
    const t = c.tRange[0] + Math.random() * (c.tRange[1] - c.tRange[0]);
    const s = Math.pow(Math.random(), c.fade);
    const outer = curveAt(JAW, t);
    const inner = curveAt(INNER, t);
    const x = (inner.x + (outer.x - inner.x) * s) * S;
    const y = (inner.y + (outer.y - inner.y) * s) * S + Math.sin(t * Math.PI) * c.chinDrop * S * s;

    const outward = Math.atan2(outer.y - inner.y, outer.x - inner.x);
    const curl = noise((x / S) * 3, (y / S) * 3) * 0.6;
    const ang = (Math.PI / 2) * 0.7 + outward * 0.3 + curl * 0.35;
    const edge = Math.sin(t * Math.PI);
    const len = (c.lenMin + Math.random() * (c.lenMax - c.lenMin)) * (0.6 + edge * 0.7) * (0.5 + s * 0.8);

    const base = 40 + Math.random() * 60;
    ctx.strokeStyle = `rgb(${Math.round(base * 0.75)},${Math.round(base * 0.72)},${Math.round(base * 0.7)})`;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.lineWidth = 0.7 + Math.random() * 1.1;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    const mx = x + Math.cos(ang + curl * 0.4) * len * 0.5;
    const my = y + Math.sin(ang + curl * 0.4) * len * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }

  // --- Mustache: flows down-and-out from the philtrum ---
  if (c.mustache) {
    const mCount = Math.floor(c.strands * 0.25);
    for (let i = 0; i < mCount; i++) {
      const t = Math.random();
      const s = Math.random();
      const o = curveAt(MUST_OUT, t);
      const n = curveAt(MUST_IN, t);
      const x = (n.x + (o.x - n.x) * s) * S;
      const y = (n.y + (o.y - n.y) * s) * S;
      const ang = Math.PI / 2 + (t - 0.5) * 1.4 + noise(x, y) * 0.2;
      const len = 4 + Math.random() * 8;
      const base = 40 + Math.random() * 60;
      ctx.strokeStyle = `rgb(${Math.round(base * 0.75)},${Math.round(base * 0.72)},${Math.round(base * 0.7)})`;
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      ctx.lineWidth = 0.7 + Math.random();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  cache.set(style, cv);
  return cv;
}
