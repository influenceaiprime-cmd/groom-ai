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

// Helper: Get a point along the jawline curve
const getJawPoint = (pts: any[], t: number) => {
  // t is 0.0 (left ear) to 1.0 (right ear)
  const idx = t * 16;
  const i = Math.floor(idx);
  const frac = idx - i;
  const p1 = pts[i];
  const p2 = pts[Math.min(i + 1, 16)];
  return { x: p1.x + (p2.x - p1.x) * frac, y: p1.y + (p2.y - p1.y) * frac };
};

export default function BeardStudio({ imageUrl, isPro, onUnlock }: BeardStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ptsRef = useRef<any[] | null>(null);
  const colorRef = useRef({ r: 60, g: 45, b: 35 }); // Default dark brown
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
    if (img) { 
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
    }
    if (!pts) return;

    const s = styleRef.current;
    if (s === 'clean') return;

    const L = lengthRef.current;
    const D = densityRef.current;
    const baseColor = colorRef.current;

    ctx.save();

    // 1. Define the Beard Zone (Polygon below mouth, along jawline)
    // Jawline is pts[0] to pts[16]. Lower lip is roughly pts[57] to pts[64]
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y); // Left ear
    for (let i = 1; i <= 16; i++) ctx.lineTo(pts[i].x, pts[i].y); // Down and across jaw to right ear
    
    // Curve up to right mouth corner, under lower lip, to left mouth corner
    ctx.lineTo(pts[54].x, pts[54].y); 
    ctx.quadraticCurveTo(pts[57].x, pts[57].y + 10, pts[48].x, pts[48].y);
    ctx.closePath();

    // Adjust zone based on style
    if (s === 'goatee') {
      ctx.beginPath();
      ctx.ellipse((pts[48].x + pts[54].x)/2, pts[57].y + 20, Math.abs(pts[48].x - pts[54].x)*0.8, Math.abs(pts[57].y - pts[8].y)*1.2, 0, 0, Math.PI*2);
    }

    // 2. SHADOW PASS (Creates depth so it doesn't look like a sticker)
    ctx.save();
    ctx.filter = 'blur(8px)';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.translate(0, 4 * L); // Push shadow down
    ctx.fill();
    ctx.restore();

    // 3. BASE COLOR PASS (Fills the zone with a solid, semi-transparent base)
    ctx.globalAlpha = 0.8 * D;
    ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
    ctx.fill();

    // 4. PROCEDURAL HAIR STRANDS (The "Next Level" Magic)
    // We clip the drawing to the beard zone so hairs don't draw on the cheeks
    ctx.clip(); 
    
    const strandCount = Math.floor(2500 * D * L);
    const bounds = { 
      minX: Math.min(...pts.slice(0,17).map(p=>p.x), pts[48].x), 
      maxX: Math.max(...pts.slice(0,17).map(p=>p.x), pts[54].x),
      minY: pts[57].y, 
      maxY: pts[8].y 
    };

    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';

    for (let i = 0; i < strandCount; i++) {
      // Random point inside the bounding box
      let x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      let y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);

      // Calculate distance from chin (pts[8]) to make hairs longer at the bottom
      const distFromChin = Math.hypot(x - pts[8].x, y - pts[8].y);
      const maxDist = Math.hypot(pts[0].x - pts[8].x, pts[0].y - pts[8].y);
      const lengthMultiplier = 0.4 + (distFromChin / maxDist) * 0.6;

      // Hair length based on style and slider
      let hairLen = 4;
      if (s === 'stubble') hairLen = 3 * L;
      else if (s === 'boxed') hairLen = 8 * L * lengthMultiplier;
      else if (s === 'full') hairLen = 16 * L * lengthMultiplier;
      else if (s === 'goatee') hairLen = 10 * L * lengthMultiplier;

      // Direction: Mostly pointing DOWN (gravity), slightly outward from face center
      const faceCenterX = (pts[0].x + pts[16].x) / 2;
      const angleOut = Math.atan2(y - pts[27].y, x - faceCenterX); // From nose bridge
      const angleDown = Math.PI / 2; // Straight down
      const angle = angleDown * 0.7 + angleOut * 0.3 + (Math.random() - 0.5) * 0.4;

      const endX = x + Math.cos(angle) * hairLen;
      const endY = y + Math.sin(angle) * hairLen;

      // Color variation (some hairs lighter, some darker for realism)
      const variance = (Math.random() - 0.5) * 30;
      const r = Math.max(0, Math.min(255, baseColor.r + variance));
      const g = Math.max(0, Math.min(255, baseColor.g + variance));
      const b = Math.max(0, Math.min(255, baseColor.b + variance));

      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 0.8 + Math.random() * 0.8;

      // Draw a slight bezier curve for natural hair bend
      const cpx = x + Math.cos(angle) * (hairLen * 0.5) + (Math.random() - 0.5) * 2;
      const cpy = y + Math.sin(angle) * (hairLen * 0.5);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(cpx, cpy, endX, endY);
      ctx.stroke();
    }

    // 5. MUSTACHE PASS (Drawn on top, flows down from nose)
    if (s !== 'goatee') {
      ctx.beginPath();
      ctx.moveTo(pts[48].x, pts[48].y);
      ctx.quadraticCurveTo(pts[51].x, pts[51].y + 15, pts[54].x, pts[54].y);
      ctx.lineTo(pts[54].x, pts[54].y - 5);
      ctx.quadraticCurveTo(pts[51].x, pts[51].y + 5, pts[48].x, pts[48].y - 5);
      ctx.closePath();
      
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Mustache strands
      const mustacheStrands = Math.floor(400 * D);
      for(let i=0; i<mustacheStrands; i++) {
         let t = Math.random();
         let startX = pts[48].x + (pts[54].x - pts[48].x) * t;
         let startY = pts[51].y + 5;
         let mLen = 8 * L;
         let mAngle = Math.PI/2 + (t - 0.5) * 0.8; // Flows down and out
         
         ctx.strokeStyle = `rgb(${baseColor.r + (Math.random()-0.5)*20}, ${baseColor.g}, ${baseColor.b})`;
         ctx.lineWidth = 1;
         ctx.beginPath();
         ctx.moveTo(startX, startY);
         ctx.lineTo(startX + Math.cos(mAngle)*mLen, startY + Math.sin(mAngle)*mLen);
         ctx.stroke();
      }
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
            // Sample hair color from sideburns/eyebrows
            const pts = det.landmarks.positions;
            const spots = [pts[19], pts[24], pts[0], pts[16]]; 
            let r = 0, g = 0, b = 0, n = 0;
            spots.forEach((p: any) => {
              const d = cctx.getImageData(Math.max(0, Math.floor(p.x) - 4), Math.max(0, Math.floor(p.y) - 10), 8, 8).data;
              for (let i = 0; i < d.length; i += 4) { 
                if(d[i+3] > 128) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
              }
            });
            if(n > 0) colorRef.current = { r: Math.round(r/n), g: Math.round(g/n), b: Math.round(b/n) };
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
        <p className="absolute top-3 left-0 right-0 mx-auto w-fit text-center text-xs font-bold text-amber-300 bg-black/70 px-3 py-1 rounded-full">{status}</p>
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
