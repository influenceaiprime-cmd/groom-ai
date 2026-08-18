// GroomAI Hair Engine - procedural haircuts with lighting-aware strands

export const HAIR_STYLES = [
  { id: 'none', name: 'No Hair', pro: false },
  { id: 'buzz', name: 'Buzz Cut', pro: false },
  { id: 'crop', name: 'Textured Crop', pro: false },
  { id: 'pompadour', name: 'Pompadour', pro: true },
  { id: 'slick', name: 'Slick Back', pro: true },
  { id: 'sidepart', name: 'Side Part', pro: true },
  { id: 'quiff', name: 'Quiff', pro: true },
];

const COHERENCE: Record<string, Record<string, [number, string]>> = {
  buzz: { stubble: [88, 'Clean rugged - the off-duty uniform'], boxed: [84, 'Sharp and low-maintenance'], full: [80, 'Rugged contrast - keep the neckline tight'], goatee: [72, 'Top-light for the chin weight'] },
  crop: { stubble: [91, 'The modern default - never fails'], boxed: [89, 'Textured and balanced'], full: [76, 'Top-light, bottom-heavy - grow the top or trim the beard'], goatee: [78, 'Street-smart, keep the crop messy'] },
  pompadour: { stubble: [90, 'Volume up top, clean below - timeless'], boxed: [88, 'Executive with an edge'], full: [93, 'The power look - own the room'], goatee: [85, 'Vintage swagger'] },
  slick: { stubble: [88, 'Boardroom ready'], boxed: [92, 'Suit energy - crisp lines'], full: [86, 'Classic gentleman'], goatee: [80, 'Wall Street vintage'] },
  sidepart: { stubble: [87, 'Smart casual'], boxed: [90, 'Tailored and tidy'], full: [82, 'Heritage barber vibe'], goatee: [79, 'Old-school sharp'] },
  quiff: { stubble: [89, 'Weekend hero'], boxed: [88, 'Balanced volume'], full: [80, 'Bold - keep the quiff tight'], goatee: [76, 'Retro, mind the proportions'] },
};

export function coherenceScore(hair: string, beard: string): { score: number; label: string } {
  const row = COHERENCE[hair];
  if (!row) return { score: 55, label: 'Add a haircut to complete the look' };
  const hit = row[beard];
  if (hit) return { score: hit[0], label: hit[1] };
  return { score: 70, label: 'Solid combo - tweak the lengths to match' };
}

const q = (p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, t: number) => {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
};

export function renderHair(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  pts: any[],
  styleId: string,
  L: number,
  D: number,
  baseColor: { r: number; g: number; b: number },
  lum: { data: Uint8ClampedArray; w: number; h: number } | null
) {
  if (styleId === 'none') return;

  const faceH = Math.hypot(pts[8].x - pts[27].x, pts[8].y - pts[27].y);
  const templeL = { x: pts[0].x - faceH * 0.06, y: pts[0].y - faceH * 0.1 };
  const templeR = { x: pts[16].x + faceH * 0.06, y: pts[16].y - faceH * 0.1 };
  const midX = (pts[19].x + pts[24].x) / 2;
  const browY = (pts[19].y + pts[24].y) / 2;

  const cfg: Record<string, { height: number; len: number; strands: number; dir: (t: number, s: number) => number; bend: number }> = {
    buzz: { height: 0.16, len: 4, strands: 2600, dir: () => -Math.PI / 2 + (Math.random() - 0.5) * 0.8, bend: 1 },
    crop: { height: 0.34, len: 12, strands: 2400, dir: (t) => Math.PI / 2 + (0.5 - t) * 0.5 + (Math.random() - 0.5) * 0.7, bend: 2 },
    pompadour: { height: 0.6, len: 22, strands: 2600, dir: (t) => -Math.PI / 2 + (t - 0.5) * 0.7 + (Math.random() - 0.5) * 0.3, bend: 4 },
    slick: { height: 0.44, len: 18, strands: 2400, dir: (t) => -Math.PI / 2 + (t - 0.5) * 1.6, bend: 3 },
    sidepart: { height: 0.4, len: 15, strands: 2400, dir: (t) => (t < 0.3 ? Math.PI * 0.75 : Math.PI * 0.15) + (Math.random() - 0.5) * 0.3, bend: 2 },
    quiff: { height: 0.5, len: 17, strands: 2500, dir: () => -Math.PI / 2 + 0.35 + (Math.random() - 0.5) * 0.4, bend: 3 },
  };
  const c = cfg[styleId] || cfg.buzz;

  const hairlineMid = { x: midX, y: browY - faceH * 0.38 };
  const crown = { x: midX, y: browY - faceH * (0.55 + c.height) };
  const hairline = (t: number) => q(templeL, hairlineMid, templeR, t);
  const top = (t: number) => q(templeL, crown, templeR, t);

  const layer = document.createElement('canvas');
  layer.width = canvas.width;
  layer.height = canvas.height;
  const lctx = layer.getContext('2d');
  if (!lctx) return;

  const zonePath = (k: CanvasRenderingContext2D) => {
    k.beginPath();
    const h0 = hairline(0);
    k.moveTo(h0.x, h0.y);
    for (let i = 1; i <= 20; i++) { const p = hairline(i / 20); k.lineTo(p.x, p.y); }
    for (let i = 20; i >= 0; i--) { const p = top(i / 20); k.lineTo(p.x, p.y); }
    k.closePath();
  };

  lctx.save();
  zonePath(lctx);
  lctx.clip();

  const lumAt = (x: number, y: number) => {
    if (!lum) return 128;
    const lx = Math.min(lum.w - 1, Math.max(0, Math.floor((x / canvas.width) * lum.w)));
    const ly = Math.min(lum.h - 1, Math.max(0, Math.floor((y / canvas.height) * lum.h)));
    return lum.data[(ly * lum.w + lx) * 4];
  };

  lctx.lineCap = 'round';
  const count = Math.floor(c.strands * D);
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const s = Math.random();
    const hp = hairline(t);
    const tp = top(t);
    const x = hp.x + (tp.x - hp.x) * s;
    const y = hp.y + (tp.y - hp.y) * s;
    const ang = c.dir(t, s);
    const len = c.len * L * (0.6 + Math.random() * 0.8);
    const variance = (Math.random() - 0.5) * 30;
    const light = 0.6 + (lumAt(x, y) / 255) * 0.8;
    const r = Math.max(0, Math.min(255, baseColor.r * light + variance));
    const g = Math.max(0, Math.min(255, baseColor.g * light + variance));
    const b = Math.max(0, Math.min(255, baseColor.b * light + variance));
    lctx.globalAlpha = 0.7 + Math.random() * 0.3;
    lctx.strokeStyle = `rgb(${r},${g},${b})`;
    lctx.lineWidth = 0.8 + Math.random() * 0.9;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    const cpx = x + Math.cos(ang) * len * 0.5 + (Math.random() - 0.5) * c.bend;
    const cpy = y + Math.sin(ang) * len * 0.5 + (Math.random() - 0.5) * c.bend;
    lctx.beginPath();
    lctx.moveTo(x, y);
    lctx.quadraticCurveTo(cpx, cpy, ex, ey);
    lctx.stroke();
  }

  if (styleId === 'slick') {
    for (let i = 0; i < 40; i++) {
      const t = Math.random();
      const s = 0.3 + Math.random() * 0.5;
      const hp = hairline(t);
      const tp = top(t);
      const x = hp.x + (tp.x - hp.x) * s;
      const y = hp.y + (tp.y - hp.y) * s;
      lctx.globalAlpha = 0.12;
      lctx.strokeStyle = '#ffffff';
      lctx.lineWidth = 1;
      lctx.beginPath();
      lctx.moveTo(x, y);
      lctx.lineTo(x + (t - 0.5) * 30, y - 8);
      lctx.stroke();
    }
  }
  lctx.globalAlpha = 1;
  lctx.restore();

  const mask = document.createElement('canvas');
  mask.width = canvas.width;
  mask.height = canvas.height;
  const mctx = mask.getContext('2d');
  if (mctx) {
    mctx.filter = 'blur(5px)';
    mctx.fillStyle = '#fff';
    zonePath(mctx);
    mctx.fill();
    lctx.globalCompositeOperation = 'destination-in';
    lctx.drawImage(mask, 0, 0);
    lctx.globalCompositeOperation = 'source-over';
  }

  ctx.drawImage(layer, 0, 0);
}
