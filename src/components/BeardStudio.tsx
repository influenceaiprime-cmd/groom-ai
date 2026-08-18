'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';
import { analyzeFaceShape } from '@/lib/faceShape';
import { HAIR_STYLES, renderHair, coherenceScore } from '@/lib/hairEngine';
import { renderBeard } from '@/lib/follicleEngine';
import type { BeardStyleId } from '@/lib/follicleEngine';

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
  const lumRef = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const grayRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [style, setStyle] = useState('stubble');
  const [hairStyle, setHairStyle] = useState('none');
  const [length, setLength] = useState(1);
  const [density, setDensity] = useState(0.9);
  const [status, setStatus] = useState('Mapping your face...');
  const [detecting, setDetecting] = useState(true);
  const [faceData, setFaceData] = useState<any>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const styleRef = useRef(style);
  const hairStyleRef = useRef(hairStyle);
  const lengthRef = useRef(length);
  const densityRef = useRef(density);
  const showOriginalRef = useRef(false);


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
    if (!pts || showOriginalRef.current) return;

    const s = styleRef.current;
    if (s !== 'clean') {
renderBeard(ctx, canvas, pts, s as BeardStyleId, lengthRef.current, densityRef.current, colorRef.current, lumRef.current);
    }
    renderHair(ctx, canvas, pts, hairStyleRef.current, lengthRef.current, densityRef.current, colorRef.current, lumRef.current);
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
  useEffect(() => { hairStyleRef.current = hairStyle; scheduleDraw(); }, [hairStyle]);
  useEffect(() => { lengthRef.current = length; scheduleDraw(); }, [length]);
  useEffect(() => { densityRef.current = density; scheduleDraw(); }, [density]);

  useEffect(() => {
    let alive = true;
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

      let fa: any = null;
      for (let i = 0; i < 20 && !fa; i++) {
        fa = (window as any).faceApi || (window as any).faceapi;
        if (!fa) await new Promise((r) => setTimeout(r, 500));
      }
      if (!fa) { if (alive) { setStatus('AI not loaded - check connection and refresh.'); setDetecting(false); } return; }

      try {
        console.log('Loading models from /models...');
        await fa.nets.tinyFaceDetector.loadFromUri('/models');
        console.log('Tiny detector loaded');
        await (fa.nets.faceLandmark68Net || fa.nets.faceLandmark68).loadFromUri('/models');
        console.log('Landmarks loaded');
        
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
              for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 128) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } }
            });
            if (n > 0) colorRef.current = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };

            const lw = 120;
            const lh = Math.max(1, Math.round((canvas.height / canvas.width) * 120));
            const lc = document.createElement('canvas');
            lc.width = lw; lc.height = lh;
            const ltx = lc.getContext('2d', { willReadFrequently: true });
            if (ltx) {
              ltx.filter = 'grayscale(100%)';
              ltx.drawImage(img, 0, 0, lw, lh);
              lumRef.current = { data: ltx.getImageData(0, 0, lw, lh).data, w: lw, h: lh };
            }
            const gc = document.createElement('canvas');
            gc.width = canvas.width; gc.height = canvas.height;
            const gtx = gc.getContext('2d');
            if (gtx) { gtx.filter = 'grayscale(100%)'; gtx.drawImage(img, 0, 0); grayRef.current = gc; }
          }
          setStatus('Face locked - try styles below');
          setDetecting(false);
          drawRef.current();
        } else if (alive) {
          setStatus('No face found - use a clear, front-facing photo.');
          setDetecting(false);
        }
      } catch (e) {
        console.error('GroomAI detection error:', e);
        if (alive) { setStatus('Detection failed: ' + String((e as any)?.message || e).slice(0, 80)); setDetecting(false); }
      }
    };
    img.src = imageUrl;
    return () => { alive = false; };
  }, [imageUrl]);

  const holdCompare = (on: boolean) => {
    showOriginalRef.current = on;
    setShowOriginal(on);
    drawRef.current();
  };

  const downloadCard = () => {
    if (!isPro) { onUnlock && onUnlock(); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const card = document.createElement('canvas');
    card.width = 1080;
    card.height = 1350;
    const ctx = card.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('GROOMAI BARBER CARD', 60, 100);
    ctx.drawImage(canvas, 190, 150, 700, 700);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(190, 150, 700, 700);
    const sp = SPECS[styleRef.current];
    const name = STYLES.find((x) => x.id === styleRef.current)?.name.toUpperCase() || '';
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('STYLE: ' + name, 60, 950);
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Length: ' + sp.length, 60, 1010);
    ctx.fillText('Cheek line: ' + sp.cheek, 60, 1060);
    ctx.fillText('Neckline: ' + sp.neck, 60, 1110);
    ctx.fillText('Notes: ' + sp.notes, 60, 1160);
    ctx.fillStyle = '#6b7280';
    ctx.font = '22px sans-serif';
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
        {faceData && faceData.shape !== 'Unknown' && (
          <div className="absolute top-3 right-3 text-left bg-black/80 border border-amber-500/40 rounded-xl p-2 max-w-[200px]">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Face Shape</p>
            <p className="text-sm text-white font-black">{faceData.shape}</p>
            <p className="text-[10px] text-gray-300 mt-1 leading-tight">{faceData.advice}</p>
          </div>
        )}
        <button
          onPointerDown={() => holdCompare(true)}
          onPointerUp={() => holdCompare(false)}
          onPointerLeave={() => holdCompare(false)}
          className="absolute bottom-3 right-3 text-[11px] font-bold text-white bg-black/70 border border-gray-600 rounded-full px-3 py-1 select-none touch-none"
        >
          {showOriginal ? 'Original' : 'Hold to compare'}
        </button>
      </div>

      <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap justify-center gap-2">
          {STYLES.map((st) => {
            const locked = st.pro && !isPro;
            return (
              <button
                key={st.id}
                onClick={() => { if (locked) { onUnlock && onUnlock(); return; } setStyle(st.id); track('beard_style', { style: st.id }); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${style === st.id ? 'border-amber-500 text-amber-300 bg-amber-500/10' : 'border-gray-700 text-gray-400'} ${locked ? 'opacity-60' : ''}`}
              >
                {locked ? '🔒 ' : '🧔 '}{st.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {HAIR_STYLES.map((hs) => {
            const locked = hs.pro && !isPro;
            return (
              <button
                key={hs.id}
                onClick={() => { if (locked) { onUnlock && onUnlock(); return; } setHairStyle(hs.id); track('hair_style', { style: hs.id }); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${hairStyle === hs.id ? 'border-amber-500 text-amber-300 bg-amber-500/10' : 'border-gray-700 text-gray-400'} ${locked ? 'opacity-60' : ''}`}
              >
                {locked ? '🔒 ' : '💈 '}{hs.name}
              </button>
            );
          })}
        </div>
        {hairStyle !== 'none' && style !== 'clean' && (
          <p className="text-center text-[11px] font-bold text-amber-300">
            Style Coherence: {coherenceScore(hairStyle, style).score}% — {coherenceScore(hairStyle, style).label}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 font-bold">
          <label>Density
            <input type="range" min={0.3} max={1} step={0.05} value={density} onChange={(e) => setDensity(Number(e.target.value))} className="w-full accent-amber-500" />
          </label>
          <label>Hair Length
            <input type="range" min={0.6} max={1.6} step={0.05} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full accent-amber-500" />
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
