// GroomAI Follicle Engine v4 - clones the user's own scalp hair as beard texture,
// adds clumped fringe strands for soft edges, feathers the whole layer.

export type BeardStyleId = 'stubble' | 'boxed' | 'full' | 'goatee';

type P = { x: number; y: number };

interface Cfg { strands: number; lenMin: number; lenMax: number; cheekFade: number; chinBoost: number; under: number; usePatch: boolean }
const CFG: Record<BeardStyleId, Cfg> = {
  stubble: { strands: 2600, lenMin: 2, lenMax: 6, cheekFade: 1, chinBoost: 0.3, under: 0.14, usePatch: false },
  boxed: { strands: 1800, lenMin: 5, lenMax: 12, cheekFade: 0.85, chinBoost: 0.5, under: 0.2, usePatch: true },
  full: { strands: 2200, lenMin: 8, lenMax: 20, cheekFade: 0.65, chinBoost: 0.9, under: 0.24, usePatch: true },
  goatee: { strands: 1400, lenMin: 5, lenMax: 14, cheekFade: 0.4, chinBoost: 1, under: 0.2, usePatch: true },
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
  lum: { data: Uint8ClampedArray; w: number; h: number } | null,
  hairPatch: HTMLCanvasElement | null,
  gray: HTMLCanvasElement | null
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

  const tRange: [number, number] = style === 'goatee' ? [0.3, 0.7] : [0, 1];
  const span = (t: number) => tRange[0] + (tRange[1] - tRange[0]) * t;

  const zonePath = (k: CanvasRenderingContext2D) => {
    k.beginPath();
    const a = innerAt(span(0));
    k.moveTo(a.x, a.y);
    for (let i = 1; i <= 20; i++) { const p = innerAt(span(i / 20)); k.lineTo(p.x, p.y); }
    for (let i = 20; i >= 0; i--) { const p = outerAt(span(i / 20)); k.lineTo(p.x, p.y); }
    k.closePath();
  };

  const mTop = pts[33].y + (pts[51].y - pts[33].y) * 0.3;
  const lipY = pts[51].y;
  const mustPath = (k: CanvasRenderingContext2D) => {
    k.beginPath();
    k.ellipse((pts[48].x + pts[54].x) / 2, (mTop + lipY) / 2 + faceH * 0.01, Math.abs(pts[48].x - pts[54].x) * 0.6, Math.max(3, (lipY - mTop) * 0.85), 0, 0, Math.PI * 2);
  };

  const lumAt = (x: number, y: number) => {
    if (!lum) return 128;
    const lx = Math.min(lum.w - 1, Math.max(0, Math.floor((x / canvas.width) * lum.w)));
    const ly = Math.min(lum.h - 1, Math.max(0, Math.floor((y / canvas.height) * lum.h)));
    return lum.data[(ly * lum.w + lx) * 4];
  };

  const layer = document.createElement('canvas');
  layer.width = canvas.width;
  layer.height = canvas.height;
  const l = layer.getContext('2d');
  if (!l) return;

  const drawStrands = (count: number, region: 'beard' | 'mustache') => {
    l.lineCap = 'round';
    const clusters = Math.floor(count / 12);
    for (let cl = 0; cl < clusters; cl++) {
      const ct = Math.random();
      const cs = Math.pow(Math.random(), 0.7);
      let cx0: number, cy0: number, outw: number;
      if (region === 'beard') {
        const base = innerAt(span(ct));
        const out = outerAt(span(ct));
        cx0 = base.x + (out.x - base.x) * cs;
        cy0 = base.y + (out.y - base.y) * cs;
        outw = Math.atan2(out.y - base.y, out.x - base.x);
      } else {
        cx0 = pts[48].x + (pts[54].x - pts[48].x) * ct;
        cy0 = mTop + Math.random() * Math.max(2, lipY - mTop);
        outw = Math.PI / 2;
      }
      const clAng = (Math.random() - 0.5) * 0.5;
      const clLen = 0.8 + Math.random() * 0.5;
      const clVar = (Math.random() - 0.5) * 30;
      for (let sIdx = 0; sIdx < 12; sIdx++) {
        const x = cx0 + (Math.random() - 0.5) * faceH * 0.03;
        const y = cy0 + (Math.random() - 0.5) * faceH * 0.03;
        const edgeIn = Math.min(1, cs * 3.5) * (0.4 + 0.6 * c.cheekFade);
        const edgeOut = Math.min(1, (1 - cs) * 5 + 0.35);
        const alpha = region === 'mustache' ? 0.5 + Math.random() * 0.4 : (0.4 + Math.random() * 0.4) * edgeIn * edgeOut;
        if (alpha < 0.06) continue;
        const dirBase = region === 'mustache' ? Math.PI / 2 + (ct - 0.5) * 1.3 : (Math.PI / 2) * 0.75 + outw * 0.25;
        const flow = dirBase + clAng + noise(x * 0.05, y * 0.05) * 0.25;
        const lenBase = region === 'mustache' ? faceH * (0.02 + Math.random() * 0.04) : (c.lenMin + (c.lenMax - c.lenMin) * cs) * (1 + c.chinBoost * Math.sin(span(ct) * Math.PI));
        const len = lenBase * L * clLen * (0.7 + Math.random() * 0.6);
        const light = 0.55 + (lumAt(x, y) / 255) * 0.9;
        l.globalAlpha = alpha;
        l.strokeStyle = `rgb(${clamp255(bc.r * light + clVar)},${clamp255(bc.g * light + clVar)},${clamp255(bc.b * light + clVar)})`;
        l.lineWidth = 0.7 + Math.random() * 0.9;
        const ex = x + Math.cos(flow) * len;
        const ey = y + Math.sin(flow) * len;
        const mx = x + Math.cos(flow + clAng * 0.5) * len * 0.5;
        const my = y + Math.sin(flow + clAng * 0.5) * len * 0.5;
        l.beginPath();
        l.moveTo(x, y);
        l.quadraticCurveTo(mx, my, ex, ey);
        l.stroke();
      }
    }
    l.globalAlpha = 1;
  };

  // --- BEARD MASS ---
  l.save();
  zonePath(l);
  l.clip();
  l.fillStyle = `rgba(12,8,5,${c.under * D})`;
  zonePath(l);
  l.fill();
  if (c.usePatch && hairPatch) {
    const pat = l.createPattern(hairPatch, 'repeat');
    if (pat) {
      l.globalAlpha = 0.5 + 0.45 * D;
      l.fillStyle = pat;
      l.fillRect(0, 0, layer.width, layer.height);
      l.globalAlpha = 1;
    }
    if (gray) {
      l.globalCompositeOperation = 'multiply';
      l.globalAlpha = 0.35;
      l.drawImage(gray, 0, 0);
      l.globalAlpha = 1;
      l.globalCompositeOperation = 'source-over';
    }
  }
  drawStrands(c.strands * D, 'beard');
  l.restore();

  // --- MUSTACHE ---
  l.save();
  mustPath(l);
  l.clip();
  l.fillStyle = `rgba(12,8,5,${0.18 * D})`;
  mustPath(l);
  l.fill();
  if (c.usePatch && hairPatch) {
    const pat = l.createPattern(hairPatch, 'repeat');
    if (pat) {
      l.globalAlpha = 0.45 + 0.4 * D;
      l.fillStyle = pat;
      l.fillRect(0, 0, layer.width, layer.height);
      l.globalAlpha = 1;
    }
  }
  drawStrands(Math.floor(500 * D), 'mustache');
  l.restore();

  // --- FEATHER the whole layer ---
  const mask = document.createElement('canvas');
  mask.width = layer.width;
  mask.height = layer.height;
  const m = mask.getContext('2d');
  if (m) {
    m.filter = 'blur(8px)';
    m.fillStyle = '#fff';
    zonePath(m);
    m.fill();
    mustPath(m);
    m.fill();
    l.globalCompositeOperation = 'destination-in';
    l.drawImage(mask, 0, 0);
    l.globalCompositeOperation = 'source-over';
  }

  ctx.drawImage(layer, 0, 0);
}
