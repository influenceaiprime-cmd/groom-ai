// GroomAI Follicle Engine v5 - shadow depth + real-hair texture fill + silhouette fringe.

export type BeardStyleId = 'stubble' | 'boxed' | 'full' | 'goatee';

type P = { x: number; y: number };

interface Cfg { shadow: number; patchAlpha: number; patchBlur: number; fringeMin: number; fringeMax: number }
const CFG: Record<BeardStyleId, Cfg> = {
  stubble: { shadow: 0.3, patchAlpha: 0.3, patchBlur: 3, fringeMin: 2, fringeMax: 5 },
  boxed: { shadow: 0.35, patchAlpha: 0.6, patchBlur: 1.5, fringeMin: 5, fringeMax: 12 },
  full: { shadow: 0.4, patchAlpha: 0.75, patchBlur: 1, fringeMin: 10, fringeMax: 20 },
  goatee: { shadow: 0.35, patchAlpha: 0.6, patchBlur: 1.5, fringeMin: 5, fringeMax: 14 },
};

const quad = (a: P, m: P, b: P, t: number): P => {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * m.x + t * t * b.x, y: u * u * a.y + 2 * u * t * m.y + t * t * b.y };
};

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
  void lum;
  const c = CFG[style];
  const faceH = Math.hypot(pts[8].x - pts[27].x, pts[8].y - pts[27].y);
  const bc = { r: Math.round(color.r * 0.6), g: Math.round(color.g * 0.6), b: Math.round(color.b * 0.6) };

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

  const layer = document.createElement('canvas');
  layer.width = canvas.width;
  layer.height = canvas.height;
  const l = layer.getContext('2d');
  if (!l) return;

  // 1. Shadow depth base (beard = darkened skin first)
  l.save();
  l.filter = `blur(${Math.max(4, Math.round(faceH * 0.02))}px)`;
  l.fillStyle = `rgba(18,12,8,${c.shadow * D})`;
  zonePath(l);
  l.fill();
  mustPath(l);
  l.fill();
  l.restore();

  // 2. Real hair texture fill (the user's own scalp hair)
  if (hairPatch) {
    l.save();
    zonePath(l);
    l.clip();
    l.filter = `blur(${c.patchBlur}px)`;
    l.globalAlpha = c.patchAlpha * (0.5 + 0.5 * D);
    const pat = l.createPattern(hairPatch, 'repeat');
    if (pat) { l.fillStyle = pat; l.fillRect(0, 0, layer.width, layer.height); }
    l.filter = 'none';
    l.globalAlpha = 1;
    if (gray) {
      l.globalCompositeOperation = 'overlay';
      l.globalAlpha = 0.3;
      l.drawImage(gray, 0, 0);
      l.globalAlpha = 1;
      l.globalCompositeOperation = 'source-over';
    }
    l.restore();

    l.save();
    mustPath(l);
    l.clip();
    l.filter = `blur(${c.patchBlur}px)`;
    l.globalAlpha = Math.min(1, c.patchAlpha + 0.15) * (0.5 + 0.5 * D);
    const pat2 = l.createPattern(hairPatch, 'repeat');
    if (pat2) { l.fillStyle = pat2; l.fillRect(0, 0, layer.width, layer.height); }
    l.globalAlpha = 1;
    l.filter = 'none';
    l.restore();
  }

  // 3. Silhouette fringe (organic edge only)
  l.save();
  l.lineCap = 'round';
  const fr = Math.floor(500 * D);
  for (let i = 0; i < fr; i++) {
    const o = outerAt(span(Math.random()));
    const ang = Math.PI / 2 + (Math.random() - 0.5) * 1.1 + Math.atan2(o.y - pts[8].y, o.x - pts[8].x) * 0.2;
    const len = (c.fringeMin + Math.random() * (c.fringeMax - c.fringeMin)) * L;
    l.globalAlpha = 0.25 + Math.random() * 0.35;
    l.strokeStyle = `rgb(${bc.r},${bc.g},${bc.b})`;
    l.lineWidth = 0.8 + Math.random() * 0.8;
    l.beginPath();
    l.moveTo(o.x, o.y);
    l.quadraticCurveTo(o.x + Math.cos(ang) * len * 0.5, o.y + Math.sin(ang) * len * 0.5, o.x + Math.cos(ang) * len, o.y + Math.sin(ang) * len);
    l.stroke();
  }
  l.globalAlpha = 1;
  l.restore();

  // 4. Feather everything
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
