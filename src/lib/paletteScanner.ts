export interface PaletteZones {
  base: string;
  crease: string;
  outerV: string;
  shimmer: string;
  all: string[];
}

function rgbToLab(r: number, g: number, b: number) {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  let x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
  let y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750) / 1.00000;
  let z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;
  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);
  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function labToHex(l: number, a: number, b: number): string {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const finv = (t: number) => {
    const t3 = t * t * t;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  };
  const x = 0.95047 * finv(fx);
  const y = finv(fy);
  const z = 1.08883 * finv(fz);
  const rl = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  const gl = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
  const bl = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
  const gamma = (c: number) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  const to255 = (c: number) => Math.round(gamma(c) * 255);
  return '#' + [to255(rl), to255(gl), to255(bl)].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// 🧠 K-Means clustering in LAB space (the spec's pan extraction, browser edition)
export function extractPalette(data: Uint8ClampedArray, width: number, height: number): PaletteZones | null {
  const samples: number[][] = [];
  const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 4000)));
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const lab = rgbToLab(data[i], data[i + 1], data[i + 2]);
      if (lab.l > 20 && lab.l < 90) samples.push([lab.l, lab.a, lab.b]);
    }
  }
  if (samples.length < 40) return null;

  const k = 6;
  const centers: number[][] = [];
  for (let i = 0; i < k; i++) {
    centers.push(samples[Math.floor(((i + 0.5) * samples.length) / k)].slice());
  }
  for (let iter = 0; iter < 12; iter++) {
    const clusters: number[][][] = Array.from({ length: k }, () => []);
    for (const s of samples) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (s[0] - centers[c][0]) ** 2 + (s[1] - centers[c][1]) ** 2 + (s[2] - centers[c][2]) ** 2;
        if (d < bd) { bd = d; bi = c; }
      }
      clusters[bi].push(s);
    }
    for (let c = 0; c < k; c++) {
      if (clusters[c].length > 0) {
        centers[c] = [0, 1, 2].map(j => clusters[c].reduce((sum, p) => sum + p[j], 0) / clusters[c].length);
      }
    }
  }

  const sorted = [...centers].sort((p, q) => q[0] - p[0]);
  const byChroma = [...centers].sort((p, q) => Math.hypot(q[1], q[2]) - Math.hypot(p[1], p[2]));
  let shimmer = byChroma[0];
  if (shimmer === sorted[0] && byChroma.length > 1) shimmer = byChroma[1];

  return {
    base: labToHex(sorted[0][0], sorted[0][1], sorted[0][2]),
    crease: labToHex(sorted[Math.floor(sorted.length / 2)][0], sorted[Math.floor(sorted.length / 2)][1], sorted[Math.floor(sorted.length / 2)][2]),
    outerV: labToHex(sorted[sorted.length - 1][0], sorted[sorted.length - 1][1], sorted[sorted.length - 1][2]),
    shimmer: labToHex(shimmer[0], shimmer[1], shimmer[2]),
    all: sorted.map(c => labToHex(c[0], c[1], c[2])),
  };
}
