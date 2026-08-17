'use client';

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
  const colorRef = useRef('#3a2b20');
  const [style, setStyle] = useState('stubble');
  const [length, setLength] = useState(1);
  const [density, setDensity] = useState(0.85);
  const [status, setStatus] = useState('Mapping your face...');

  const styleRef = useRef(style);
  const lengthRef = useRef(length);
  const densityRef = useRef(density);

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas ? canvas.getContext('2d') : null;
    const pts = ptsRef.current;
    if (!canvas || !ctx) return;
    const img = (canvas as any).__img as HTMLImageElement | undefined;
    if (img) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); }
    if (!pts) return;
    const s = styleRef.current;
    if (s === 'clean') return;
    const faceH = Math.hypot(pts[8].x - pts[27].x, pts[8].y - pts[27].y);
    const L = lengthRef.current;
    const A = densityRef.current;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colorRef.current;
    ctx.fillStyle = colorRef.current;

    const jawStroke = (width: number, expand: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.beginPath();
      const c = pts[8];
      for (let i = 0; i <= 16; i++) {
        const dx = pts[i].x - c.x;
        const dy = pts[i].y - c.y;
        const len = Math.hypot(dx, dy) || 1;
        const x = pts[i].x + (dx / len) * expand;
        const y = pts[i].y + (dy / len) * expand;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const mustache = (width: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(pts[48].x, pts[48].y - width * 0.2);
      ctx.quadraticCurveTo(pts[33].x, pts[51].y - (pts[51].y - pts[33].y) * 0.4, pts[54].x, pts[54].y - width * 0.2);
      ctx.stroke();
    };

    if (s === 'stubble') {
      jawStroke(faceH * 0.1 * L, 0, A * 0.55);
      mustache(faceH * 0.05 * L, A * 0.5);
    } else if (s === 'boxed') {
      jawStroke(faceH * 0.16 * L, faceH * 0.02, A * 0.85);
      mustache(faceH * 0.07 * L, A * 0.85);
    } else if (s === 'full') {
      jawStroke(faceH * 0.26 * L, faceH * 0.06 * L, A * 0.9);
      jawStroke(faceH * 0.16 * L, faceH * 0.1 * L, A * 0.9);
      mustache(faceH * 0.09 * L, A * 0.9);
    } else if (s === 'goatee') {
      ctx.globalAlpha = A * 0.9;
      const mc = { x: (pts[48].x + pts[54].x) / 2, y: (pts[51].y + pts[57].y) / 2 };
      const rx = Math.hypot(pts[48].x - pts[54].x, pts[48].y - pts[54].y) * 0.62;
      const ry = Math.hypot(pts[51].x - pts[57].x, pts[51].y - pts[57].y) * 1.5;
      ctx.lineWidth = ry * 0.5;
      ctx.beginPath();
      ctx.ellipse(mc.x, mc.y + ry * 0.2, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => { styleRef.current = style; drawRef.current(); }, [style]);
  useEffect(() => { lengthRef.current = length; drawRef.current(); }, [length]);
  useEffect(() => { densityRef.current = density; drawRef.current(); }, [density]);

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
      const fa = (window as any).faceApi;
      if (!fa) { if (alive) setStatus('AI not loaded - refresh the page.'); return; }
      try {
        await fa.loadTinyFaceDetectorModel('/models');
        await fa.loadFaceLandmark68Model('/models');
        const det = await fa.detectSingleFace(canvas, new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })).withFaceLandmarks();
        if (det && alive) {
          ptsRef.current = det.landmarks.positions;
          const cctx = canvas.getContext('2d');
          if (cctx) {
            const pts = det.landmarks.positions;
            const spots = [pts[19], pts[24], pts[0], pts[16]];
            let r = 0, g = 0, b = 0, n = 0;
            spots.forEach((p: any) => {
              const d = cctx.getImageData(Math.max(0, Math.floor(p.x) - 3), Math.max(0, Math.floor(p.y) - 8), 6, 6).data;
              for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
            });
            colorRef.current = `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
          }
          setStatus('Face locked - try styles below');
          drawRef.current();
        } else if (alive) {
          setStatus('No face found - use a clear, front-facing photo.');
        }
      } catch (e) {
        if (alive) setStatus('Detection failed - try better lighting.');
      }
    };
    img.src = imageUrl;
    return () => { alive = false; };
  }, [imageUrl]);

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
    const name = STYLES.find((s) => s.id === styleRef.current)?.name.toUpperCase() || '';
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
        <p className="absolute top-3 left-0 right-0 mx-auto w-fit text-center text-xs font-bold text-amber-300 bg-black/70 px-3 py-1 rounded-full">{status}</p>
      </div>
      <div className="bg-[#111827] rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap justify-center gap-2">
          {STYLES.map((st) => {
            const locked = st.pro && !isPro;
            return (
              <button
                key={st.id}
                onClick={() => {
                  if (locked) { onUnlock && onUnlock(); return; }
                  setStyle(st.id);
                  track('beard_style', { style: st.id });
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${style === st.id ? 'border-amber-500 text-amber-300 bg-amber-500/10' : 'border-gray-700 text-gray-400'} ${locked ? 'opacity-60' : ''}`}
              >
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
