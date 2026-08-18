'use client';
import { analyzeFaceShape } from '@/lib/faceShape';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';

interface BeardStudioProps {
  imageUrl: string;
  isPro?: boolean;
  onUnlock?: () => void;
}

const STYLES = [
  { id: 'clean', name: 'Clean Shaven', pro: false },
  { id: 'stubble', name: '5-Day Stubble', pro: false },
  { id: 'boxed', name: 'Short Boxed', pro: false },
  { id: 'full', name: 'Full Beard', pro: true },
  { id: 'goatee', name: 'Goatee', pro: true },
];

const SPECS: Record<string, { length: string; cheek: string; neck: string; notes: string }> = {
  clean: { length: '0mm', cheek: 'N/A', neck: 'N/A', notes: 'Shave with the grain, cold rinse, moisturize.' },
  stubble: { length: '3-5mm', cheek: 'Natural - just tidy stray hairs', neck: '1 finger above Adam\'s apple', notes: 'Trim every 2-3 days with guard #1.' },
  boxed: { length: '10-15mm', cheek: 'Straight line, 2 fingers above jaw', neck: 'Rounded, 1 finger above Adam\'s apple', notes: 'Sharp edges. Fade sideburns into your hair.' },
  full: { length: '25-40mm', cheek: 'Natural cheek line', neck: '1-2 fingers above Adam\'s apple', notes: 'Grow 4-6 weeks before shaping. Oil daily.' },
  goatee: { length: '8-12mm', cheek: 'Shaved clean', neck: 'Clean', notes: 'Round the chin patch. Line up mustache edges.' },
};

export default function BeardStudio({ imageUrl, isPro, onUnlock }: BeardStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ptsRef = useRef<any[] | null>(null);
  const colorRef = useRef({ r: 60, g: 45, b: 35 });
  const [style, setStyle] = useState('stubble');
  const [length, setLength] = useState(1);
  const [density, setDensity] = useState(0.9);
  const [status, setStatus] = useState('Mapping your face...');
  const [detecting, setDetecting] = useState(true);
  const [faceData, setFaceData] = useState<any>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const showOriginalRef = useRef(false);

  const styleRef = useRef(style);
  const lengthRef = useRef(length);
  const densityRef = useRef(density);
  const rafRef = useRef<number | null>(null);
  const lumRef = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);

  // Builds the beard zone path on any given context (used for both the visible
  // clip and the separate feather-mask canvas, so they always match exactly)
  const getJawPoint = (pts: any[], t: number) => { const idx = t * 16; const i = Math.floor(idx); const frac = idx - i; const p1 = pts[i]; const p2 = pts[Math.min(i + 1, 16)]; return { x: p1.x + (p2.x - p1.x) * frac, y: p1.y + (p2.y - p1.y) * frac }; };

  const buildZonePath = (ctx: CanvasRenderingContext2D, pts: any[], isGoatee: boolean) => {
    ctx.beginPath();
    if (isGoatee) {
      ctx.ellipse(
        (pts[48].x + pts[54].x) / 2,
        pts[57].y + 20,
        Math.abs(pts[48].x - pts[54].x) * 0.8,
        Math.abs(pts[57].y - pts[8].y) * 1.2,
        0, 0, Math.PI * 2
      );
    } else {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= 16; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[54].x, pts[54].y);
      ctx.quadraticCurveTo(pts[57].x, pts[57].y + 10, pts[48].x, pts[48].y);
    }
    ctx.closePath();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas ? canvas.getContext('2d') : null;
    const pts = ptsRef.current;
    if (!canvas || !ctx) return;

    const img = (canvas as any).__img as HTMLImageElement | undefined;
    if (img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    if (!pts) return;
    if (showOriginalRef.current) return;

    const s = styleRef.current;
    if (s === 'clean') return;

    const L = lengthRef.current;
    const D = densityRef.current;
    const baseColor = colorRef.current;
    const isGoatee = s === 'goatee';

    // Render the beard onto an offscreen layer first, so we can feather its
    // edges with a blurred alpha mask before compositing onto the real photo.
    // This is what removes the hard-edged "sticker" look.
    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    const lctx = layer.getContext('2d');
    if (!lctx) return;

    lctx.save();
    buildZonePath(lctx, pts, isGoatee);
    lctx.clip();

    // Shadow pass - depth cue
    lctx.save();
    lctx.filter = 'blur(8px)';
    lctx.fillStyle = 'rgba(0,0,0,0.3)';
    lctx.translate(0, 4 * L);
    buildZonePath(lctx, pts, isGoatee);
    lctx.fill();
    lctx.restore();

    // Base color pass - kept subtle. This used to be the dominant visual
    // (0.8 alpha), which is what produced the flat gray wedge. Hair strands
    // should carry the texture; the base is just a faint undertone now.
    lctx.globalAlpha = 0.28 * D;
    lctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
    buildZonePath(lctx, pts, isGoatee);
    lctx.fill();

    // Hair strands
    const bounds = isGoatee
      ? {
          minX: (pts[48].x + pts[54].x) / 2 - Math.abs(pts[48].x - pts[54].x) * 0.8,
          maxX: (pts[48].x + pts[54].x) / 2 + Math.abs(pts[48].x - pts[54].x) * 0.8,
          minY: pts[57].y + 20 - Math.abs(pts[57].y - pts[8].y) * 1.2,
          maxY: pts[57].y + 20 + Math.abs(pts[57].y - pts[8].y) * 1.2,
        }
      : {
          minX: Math.min(...pts.slice(0, 17).map((p: any) => p.x), pts[48].x),
          maxX: Math.max(...pts.slice(0, 17).map((p: any) => p.x), pts[54].x),
          minY: pts[57].y,
          maxY: pts[8].y,
        };

    const strandCount = Math.floor((isGoatee ? 1600 : 3200) * D * L);
    const lum = lumRef.current;
    const lumAt = (x: number, y: number) => { if (!lum) return 128; const lx = Math.min(lum.w - 1, Math.max(0, Math.floor((x / canvas.width) * lum.w))); const ly = Math.min(lum.h - 1, Math.max(0, Math.floor((y / canvas.height) * lum.h))); return lum.data[(ly * lum.w + lx) * 4]; };

    lctx.globalAlpha = 1;
    lctx.lineCap = 'round';

    for (let i = 0; i < strandCount; i++) {
      let x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      let y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);

      const distFromChin = Math.hypot(x - pts[8].x, y - pts[8].y);
      const maxDist = Math.hypot(pts[0].x - pts[8].x, pts[0].y - pts[8].y);
      const lengthMultiplier = 0.4 + (distFromChin / maxDist) * 0.6;

      let hairLen = 4;
      if (s === 'stubble') hairLen = 3 * L;
      else if (s === 'boxed') hairLen = 8 * L * lengthMultiplier;
      else if (s === 'full') hairLen = 16 * L * lengthMultiplier;
      else if (s === 'goatee') hairLen = 10 * L * lengthMultiplier;

      const faceCenterX = (pts[0].x + pts[16].x) / 2;
      const angleOut = Math.atan2(y - pts[27].y, x - faceCenterX);
      const angleDown = Math.PI / 2;
      const angle = angleDown * 0.7 + angleOut * 0.3 + (Math.random() - 0.5) * 0.4;

      const endX = x + Math.cos(angle) * hairLen;
      const endY = y + Math.sin(angle) * hairLen;

      const variance = (Math.random() - 0.5) * 30;
      const r = Math.max(0, Math.min(255, baseColor.r * (0.6 + (lumAt(x, y) / 255) * 0.8) + variance));
      const g = Math.max(0, Math.min(255, baseColor.g * (0.6 + (lumAt(x, y) / 255) * 0.8) + variance));
      const b = Math.max(0, Math.min(255, baseColor.b * (0.6 + (lumAt(x, y) / 255) * 0.8) + variance));

      // Slightly higher per-strand opacity now that the base fill is subtler,
      // so strands do the visual work of reading as "hair" rather than a fill.
      lctx.globalAlpha = 0.75 + Math.random() * 0.25;
      lctx.strokeStyle = `rgb(${r},${g},${b})`;
      lctx.lineWidth = 0.8 + Math.random() * 0.9;

      const cpx = x + Math.cos(angle) * (hairLen * 0.5) + (Math.random() - 0.5) * 2;
      const cpy = y + Math.sin(angle) * (hairLen * 0.5);

      lctx.beginPath();
      lctx.moveTo(x, y);
      lctx.quadraticCurveTo(cpx, cpy, endX, endY);
      lctx.stroke();
    }
    lctx.globalAlpha = 1;

    // Mustache pass (skip for goatee - isolated chin patch)
    if (!isGoatee) {
      lctx.beginPath();
      lctx.moveTo(pts[48].x, pts[48].y);
      lctx.quadraticCurveTo(pts[51].x, pts[51].y + 15, pts[54].x, pts[54].y);
      lctx.lineTo(pts[54].x, pts[54].y - 5);
      lctx.quadraticCurveTo(pts[51].x, pts[51].y + 5, pts[48].x, pts[48].y - 5);
      lctx.closePath();

      lctx.shadowColor = 'rgba(0,0,0,0.5)';
      lctx.shadowBlur = 4;
      lctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
      lctx.globalAlpha = 0.5;
      lctx.fill();
      lctx.shadowBlur = 0;
      lctx.globalAlpha = 1;

      const mustacheStrands = Math.floor(500 * D);
      for (let i = 0; i < mustacheStrands; i++) {
        let t = Math.random();
        let startX = pts[48].x + (pts[54].x - pts[48].x) * t;
        let startY = pts[51].y + 5;
        let mLen = 8 * L;
        let mAngle = Math.PI / 2 + (t - 0.5) * 0.8;

        lctx.strokeStyle = `rgb(${baseColor.r + (Math.random() - 0.5) * 20}, ${baseColor.g}, ${baseColor.b})`;
        lctx.lineWidth = 1;
        lctx.beginPath();
        lctx.moveTo(startX, startY);
        lctx.lineTo(startX + Math.cos(mAngle) * mLen, startY + Math.sin(mAngle) * mLen);
        lctx.stroke();
      }
    }
    lctx.restore();

    // Flyaway hairs for organic silhouette
    const flyaways = Math.floor(60 * D);
    for (let i = 0; i < flyaways; i++) { const t = Math.random(); const p = getJawPoint(pts, t); const ang = Math.PI / 2 + (Math.random() - 0.5) * 1.2; const fl = (6 + Math.random() * 10) * L; lctx.globalAlpha = 0.3 + Math.random() * 0.3; lctx.strokeStyle = `rgb(${baseColor.r},${baseColor.g},${baseColor.b})`; lctx.lineWidth = 0.8; lctx.beginPath(); lctx.moveTo(p.x, p.y); lctx.lineTo(p.x + Math.cos(ang) * fl, p.y + Math.sin(ang) * fl); lctx.stroke(); }
    lctx.globalAlpha = 1;

    // Feather mask: draw the same zone shape blurred, then use it to soften
    // the layer's edges via destination-in compositing. This is what turns
    // the hard "sticker" edge into a soft, blended-into-skin edge.
    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    const mctx = mask.getContext('2d');
    if (mctx) {
      mctx.filter = 'blur(5px)';
      mctx.fillStyle = '#fff';
      buildZonePath(mctx, pts, isGoatee);
      mctx.fill();

      lctx.globalCompositeOperation = 'destination-in';
      lctx.filter = 'none';
      lctx.drawImage(mask, 0, 0);
      lctx.globalCompositeOperation = 'source-over';
    }

    // Composite the finished, feathered beard layer onto the real photo
    ctx.drawImage(layer, 0, 0);
  };

  const drawRef = useRef(draw);
  drawRef.current = draw;

  const scheduleDraw = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawRef.current();
    });
  };

  useEffect(() => { styleRef.current = style; scheduleDraw(); }, [style]);
  useEffect(() => { lengthRef.current = length; scheduleDraw(); }, [length]);
  useEffect(() => { densityRef.current = density; scheduleDraw(); }, [density]);

  useEffect(() => {
    let alive = true;
    setDetecting(true);
    setLoadFailed(false);
    setStatus('Mapping your face...');

    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxW = 1000;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      (canvas as any).__img = img;

      let fa: any = (window as any).faceApi || (window as any).faceapi;
      for (let i = 0; i < 20 && !fa; i++) {
        await new Promise((r) => setTimeout(r, 500));
        fa = (window as any).faceApi || (window as any).faceapi;
      }
      if (!fa) {
        if (alive) { setStatus('AI not loaded - check your connection.'); setDetecting(false); setLoadFailed(true); }
        return;
      }

      try {
        await fa.nets.tinyFaceDetector.loadFromUri('/models');
        await fa.nets.faceLandmark68Net.loadFromUri('/models');
        const det = await fa.detectSingleFace(canvas, new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })).withFaceLandmarks();

        if (det && alive) {
          ptsRef.current = det.landmarks.positions;
          setFaceData(analyzeFaceShape(det.landmarks.positions));
          const cctx = canvas.getContext('2d', { willReadFrequently: true });
          if (cctx) {
            const pts = det.landmarks.positions;
            const spots = [pts[19], pts[24], pts[0], pts[16]];
            let r = 0, g = 0, b = 0, n = 0;
            spots.forEach((p: any) => {
              const d = cctx.getImageData(Math.max(0, Math.floor(p.x) - 4), Math.max(0, Math.floor(p.y) - 10), 8, 8).data;
              for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] > 128) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
              }
            });
            if (n > 0) colorRef.current = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
          }
          const lc = document.createElement('canvas'); const lw = 120; const lh = Math.max(1, Math.round((canvas.height / canvas.width) * 120)); lc.width = lw; lc.height = lh; const ltx = lc.getContext('2d', { willReadFrequently: true }); if (ltx) { ltx.filter = 'grayscale(100%)'; ltx.drawImage(img, 0, 0, lw, lh); lumRef.current = { data: ltx.getImageData(0, 0, lw, lh).data, w: lw, h: lh }; }
          setStatus('Face locked - try styles below');
          setDetecting(false);
          drawRef.current();
        } else if (alive) {
          setStatus('No face found - use a clear, front-facing photo.');
          setDetecting(false);
          setLoadFailed(true);
        }
      } catch (e) {
        console.error('GroomAI detection error:', e);
        if (alive) { setStatus('Detection failed - try better lighting.'); setDetecting(false); setLoadFailed(true); }
      }
    };
    img.src = imageUrl;
    return () => { alive = false; };
  }, [imageUrl, retryTick]);

  const downloadCard = () => {
    if (!isPro) { onUnlock && onUnlock(); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const card = document.createElement('canvas');
    card.width = 1080; card.height = 1350;
    const ctx = card.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0b0f14'; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 56px sans-serif';
    ctx.fillText('GROOMAI BARBER CARD', 60, 100);
    ctx.drawImage(canvas, 190, 150, 700, 700);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.strokeRect(190, 150, 700, 700);

    const sp = SPECS[styleRef.current];
    const name = STYLES.find((s) => s.id === styleRef.current)?.name.toUpperCase() || '';
    ctx.fillStyle = '#e5e7eb'; ctx.font = 'bold 40px sans-serif'; ctx.fillText('STYLE: ' + name, 60, 950);
    ctx.font = '30px sans-serif'; ctx.fillStyle = '#9ca3af';
    ctx.fillText('Length: ' + sp.length, 60, 1010);
    ctx.fillText('Cheek line: ' + sp.cheek, 60, 1060);
    ctx.fillText('Neckline: ' + sp.neck, 60, 1110);
    ctx.fillText('Notes: ' + sp.notes, 60, 1160);
    ctx.fillStyle = '#6b7280'; ctx.font = '22px sans-serif';
    ctx.fillText('Generated by GroomAI - your face never left your device.', 60, 1290);

    const a = document.createElement('a');
    a.download = 'groomai-barber-card.png';
    a.href = card.toDataURL('image/png');
    a.click();
    track('barber_card', { style: styleRef.current });
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-black">
        <canvas ref={canvasRef} className="w-full h-auto" />
        <p className="absolute top-3 left-3 text-xs font-bold text-amber-300 bg-black/70 px-3 py-1 rounded-full flex items-center gap-2">
          {detecting && <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          {status}
        </p>
        {loadFailed && (
          <button
            onClick={() => setRetryTick((t) => t + 1)}
            className="absolute bottom-3 left-0 right-0 mx-auto w-fit text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-full transition-colors"
          >
            🔄 Retry
          </button>
        )}
        {!detecting && !loadFailed && styleRef.current !== "clean" && (
          <button
            onMouseDown={() => { showOriginalRef.current = true; setShowOriginal(true); drawRef.current(); }}
            onMouseUp={() => { showOriginalRef.current = false; setShowOriginal(false); drawRef.current(); }}
            onMouseLeave={() => { if (showOriginalRef.current) { showOriginalRef.current = false; setShowOriginal(false); drawRef.current(); } }}
            onTouchStart={() => { showOriginalRef.current = true; setShowOriginal(true); drawRef.current(); }}
            onTouchEnd={() => { showOriginalRef.current = false; setShowOriginal(false); drawRef.current(); }}
            className="absolute top-3 right-3 text-[10px] font-bold text-white bg-black/60 hover:bg-black/80 px-3 py-1.5 rounded-full transition-colors select-none"
          >
            {showOriginal ? "Original" : "Hold to Compare"}
          </button>
        )}
      </div>
      <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap justify-center gap-2">
          {STYLES.map((st) => {
            const locked = st.pro && !isPro;
            return (
              <button key={st.id} onClick={() => { if (locked) { onUnlock && onUnlock(); return; } setStyle(st.id); track('beard_style', { style: st.id }); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${style === st.id ? 'border-amber-500 text-amber-300 bg-amber-500/10' : 'border-gray-700 text-gray-400'} ${locked ? 'opacity-60' : ''}`}>
                {locked ? '🔒 ' : '🧔 '}{st.name}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 font-bold">
          <label>Length
            <input type="range" min={0.6} max={1.6} step={0.05} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full accent-amber-500" />
          </label>
          <label>Density
            <input type="range" min={0.3} max={1} step={0.05} value={density} onChange={(e) => setDensity(Number(e.target.value))} className="w-full accent-amber-500" />
          </label>
        </div>
        <button onClick={downloadCard} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-extrabold hover:scale-[1.02] transition-transform">
          📋 Download Barber Card
        </button>
        <p className="text-[10px] text-gray-500 text-center">Free: 3 styles • PRO: all styles + Barber Card</p>
      </div>
    </div>
  );
}
