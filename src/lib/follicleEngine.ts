// GroomAI Follicle Engine v6 - shadow depth + individual hair strands + silhouette fringe.
// Uses the user's real sampled hair color (from eyebrows/sideburns) applied to
// actual drawn strands, rather than a tiled texture patch sampled from the photo -
// the patch approach was unreliable because the sample point often landed on
// skin/forehead rather than real hair texture.

export type BeardStyleId = 'stubble' | 'boxed' | 'full' | 'goatee';

type P = { x: number; y: number };

interface Cfg { shadow: number; strandDensity: number; strandAlphaMin: number; strandAlphaMax: number; fringeMin: number; fringeMax: number }
const CFG: Record<BeardStyleId, Cfg> = {
  stubble: { shadow: 0.15, strandDensity: 2600, strandAlphaMin: 0.5, strandAlphaMax: 0.85, fringeMin: 2, fringeMax: 5 },
  boxed: { shadow: 0.2, strandDensity: 3400, strandAlphaMin: 0.6, strandAlphaMax: 0.95, fringeMin: 5, fringeMax: 12 },
  full: { shadow: 0.25, strandDensity: 4200, strandAlphaMin: 0.7, strandAlphaMax: 1, fringeMin: 10, fringeMax: 20 },
  goatee: { shadow: 0.2, strandDensity: 2200, strandAlphaMin: 0.6, strandAlphaMax: 0.95, fringeMin: 5, fringeMax: 14 },
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
  color: { r: number; g: number; b: number }
) {
  const c = CFG[style];
  const faceH = Math.hypot(pts[8].x - pts[27].x, pts[8].y - pts[27].y);

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

  // 1. Shadow depth base - subtle, just enough to suggest depth under the strands
  l.save();
  l.filter = `blur(${Math.max(4, Math.round(faceH * 0.02))}px)`;
  l.fillStyle = `rgba(18,12,8,${c.shadow * D})`;
  zonePath(l);
  l.fill();
  mustPath(l);
  l.fill();
  l.restore();

  // 2. Real individual hair strands, colored from the user's actual sampled hair color
  l.save();
  zonePath(l);
  l.clip();
  l.lineCap = 'round';

  const bounds = {
    minX: Math.min(...pts.slice(0, 17).map((p: any) => p.x), pts[48].x),
    maxX: Math.max(...pts.slice(0, 17).map((p: any) => p.x), pts[54].x),
    minY: mTop,
    maxY: pts[8].y + faceH * 0.08,
  };

  const strandCount = Math.floor(c.strandDensity * D * Math.max(0.5, Math.min(1.5, L)));

  for (let i = 0; i < strandCount; i++) {
    const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
    const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);

    const distFromChin = Math.hypot(x - pts[8].x, y - pts[8].y);
    const maxDist = Math.hypot(pts[0].x - pts[8].x, pts[0].y - pts[8].y);
    const lengthMultiplier = 0.4 + (distFromChin / maxDist) * 0.6;

    let hairLen = 4;
    if (style === 'stubble') hairLen = 3 * L;
    else if (style === 'boxed') hairLen = 8 * L * lengthMultiplier;
    else if (style === 'full') hairLen = 16 * L * lengthMultiplier;
    else if (style === 'goatee') hairLen = 10 * L * lengthMultiplier;

    const faceCenterX = (pts[0].x + pts[16].x) / 2;
    const angleOut = Math.atan2(y - pts[27].y, x - faceCenterX);
    const angleDown = Math.PI / 2;
    const angle = angleDown * 0.7 + angleOut * 0.3 + (Math.random() - 0.5) * 0.4;

    const endX = x + Math.cos(angle) * hairLen;
    const endY = y + Math.sin(angle) * hairLen;

    const variance = (Math.random() - 0.5) * 30;
    const r = Math.max(0, Math.min(255, color.r + variance));
    const g = Math.max(0, Math.min(255, color.g + variance));
    const b = Math.max(0, Math.min(255, color.b + variance));

    l.globalAlpha = c.strandAlphaMin + Math.random() * (c.strandAlphaMax - c.strandAlphaMin);
    l.strokeStyle = `rgb(${r},${g},${b})`;
    l.lineWidth = 0.8 + Math.random() * 0.9;

    const cpx = x + Math.cos(angle) * (hairLen * 0.5) + (Math.random() - 0.5) * 2;
    const cpy = y + Math.sin(angle) * (hairLen * 0.5);

    l.beginPath();
    l.moveTo(x, y);
    l.quadraticCurveTo(cpx, cpy, endX, endY);
    l.stroke();
  }
  l.globalAlpha = 1;
  l.restore();

  // Mustache
  if (style !== 'goatee') {
    l.save();
    mustPath(l);
    l.clip();
    const mustacheStrands = Math.floor(500 * D);
    for (let i = 0; i < mustacheStrands; i++) {
      const t = Math.random();
      const startX = pts[48].x + (pts[54].x - pts[48].x) * t;
      const startY = mTop + Math.random() * (lipY - mTop);
      const mLen = 7 * L;
      const mAngle = Math.PI / 2 + (t - 0.5) * 0.8;
      const variance = (Math.random() - 0.5) * 20;

      l.globalAlpha = 0.6 + Math.random() * 0.3;
      l.strokeStyle = `rgb(${Math.max(0, color.r + variance)},${Math.max(0, color.g + variance)},${Math.max(0, color.b + variance)})`;
      l.lineWidth = 1;
      l.beginPath();
      l.moveTo(startX, startY);
      l.lineTo(startX + Math.cos(mAngle) * mLen, startY + Math.sin(mAngle) * mLen);
      l.stroke();
    }
    l.globalAlpha = 1;
    l.restore();
  }

  // 3. Silhouette fringe - stray hairs along the outer edge for a natural, non-clipped look
  l.save();
  l.lineCap = 'round';
  const fr = Math.floor(500 * D);
  for (let i = 0; i < fr; i++) {
    const o = outerAt(span(Math.random()));
    const ang = Math.PI / 2 + (Math.random() - 0.5) * 1.1 + Math.atan2(o.y - pts[8].y, o.x - pts[8].x) * 0.2;
    const len = (c.fringeMin + Math.random() * (c.fringeMax - c.fringeMin)) * L;
    const variance = (Math.random() - 0.5) * 25;
    l.globalAlpha = 0.25 + Math.random() * 0.35;
    l.strokeStyle = `rgb(${Math.max(0, color.r + variance)},${Math.max(0, color.g + variance)},${Math.max(0, color.b + variance)})`;
    l.lineWidth = 0.8 + Math.random() * 0.8;
    l.beginPath();
    l.moveTo(o.x, o.y);
    l.quadraticCurveTo(o.x + Math.cos(ang) * len * 0.5, o.y + Math.sin(ang) * len * 0.5, o.x + Math.cos(ang) * len, o.y + Math.sin(ang) * len);
    l.stroke();
  }
  l.globalAlpha = 1;
  l.restore();

  // 4. Feather the whole beard's edges into the skin
  const mask = document.createElement('canvas');
  mask.width = layer.width;
  mask.height = layer.height;
  const m = mask.getContext('2d');
  if (m) {
    m.filter = 'blur(6px)';
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
