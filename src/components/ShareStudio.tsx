'use client';

import { useRef, useState } from 'react';
import { SkinAnalysis } from '@/types';
import { buildCoachPlan } from '@/lib/makeupCoach';

interface ShareStudioProps {
  imageUrl: string;
  analysis: SkinAnalysis;
  isPro?: boolean;
}

export default function ShareStudio({ imageUrl, analysis, isPro }: ShareStudioProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [pos, setPos] = useState(50);
  const plan = buildCoachPlan(analysis);

  const move = (clientX: number) => {
    const el = boxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)));
  };

  const downloadCard = () => {
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1920;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, '#fdf2f8');
    g.addColorStop(1, '#ffffff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1920);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#db2777';
    ctx.font = 'bold 76px sans-serif';
    ctx.fillText('GlamAI Beauty ID', 540, 240);
    ctx.beginPath();
    ctx.arc(540, 520, 150, 0, Math.PI * 2);
    ctx.fillStyle = analysis.skinToneHex;
    ctx.fill();
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 52px monospace';
    ctx.fillText(analysis.skinToneHex, 540, 760);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 68px sans-serif';
    ctx.fillText(`${plan.seasonEmoji} ${plan.season}`, 540, 900);
    ctx.fillStyle = '#6b7280';
    ctx.font = '42px sans-serif';
    ctx.fillText(`${analysis.toneCategory} - ${analysis.undertone} undertone`, 540, 990);
    const dots = [analysis.skinToneHex, ...analysis.matches.slice(0, 3).map(m => m.hexColor)];
    dots.forEach((hex, i) => {
      ctx.beginPath();
      ctx.arc(540 - (dots.length - 1) * 55 + i * 110, 1150, 42, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    });
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText(`Best Match: ${analysis.matches[0].brand} ${analysis.matches[0].shadeName}`, 540, 1350);
    ctx.fillStyle = isPro ? '#db2777' : '#9ca3af';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(isPro ? 'GlamAI PRO' : 'Made with GlamAI', 540, 1800);
    const a = document.createElement('a');
    a.download = 'glamai-beauty-id.png';
    a.href = c.toDataURL('image/png');
    a.click();
  };

  const share = async () => {
    const text = `I'm a ${plan.season} ${plan.seasonEmoji} on GlamAI! My perfect foundation: ${analysis.matches[0].brand} ${analysis.matches[0].shadeName}. Find yours:`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        alert('Copied! Paste it in your story 💖');
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-4 text-left">
      {/* WIPE SLIDER */}
      <div
        ref={boxRef}
        className="relative rounded-2xl overflow-hidden shadow-xl select-none touch-none aspect-[3/4] max-h-[500px] w-full cursor-ew-resize"
        onPointerDown={(e) => { dragging.current = true; move(e.clientX); }}
        onPointerMove={(e) => { if (dragging.current) move(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerLeave={() => { dragging.current = false; }}
      >
        <img src={imageUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <img src={imageUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(1.25) brightness(1.07) contrast(1.06)' }} />
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/10 to-purple-500/10"></div>
        </div>
        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-lg" style={{ left: `${pos}%` }}>
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center text-pink-600 font-bold text-sm">⟷</div>
        </div>
        <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/50 text-white px-2 py-1 rounded-full">BEFORE</span>
        <span className="absolute top-2 right-2 text-[10px] font-bold bg-pink-600/80 text-white px-2 py-1 rounded-full">AFTER ✨</span>
        {!isPro && (
          <span className="absolute bottom-2 right-2 text-[10px] font-semibold bg-black/40 text-white px-2 py-1 rounded-full">Made with GlamAI ✨</span>
        )}
      </div>
      <p className="text-center text-xs text-gray-500">Drag the handle to reveal your glam glow ✨</p>

      {/* BEAUTY ID CARD */}
      <div className="bg-gradient-to-br from-pink-100 via-white to-purple-100 rounded-2xl p-5 border-2 border-pink-200 shadow-lg">
        <p className="text-center text-xs font-bold text-pink-600 uppercase tracking-widest">GlamAI Beauty ID</p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="w-14 h-14 rounded-full border-4 border-white shadow-md" style={{ backgroundColor: analysis.skinToneHex }}></div>
          <div>
            <p className="text-xl font-extrabold text-gray-900">{plan.seasonEmoji} {plan.season}</p>
            <p className="text-xs text-gray-600 capitalize">{analysis.toneCategory} • {analysis.undertone} undertone • {analysis.skinToneHex}</p>
          </div>
        </div>
        <div className="flex justify-center gap-2 mt-3">
          {[analysis.skinToneHex, ...analysis.matches.slice(0, 3).map(m => m.hexColor)].map((hex, i) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-white shadow" style={{ backgroundColor: hex }}></div>
          ))}
        </div>
        <p className="text-center text-xs font-semibold text-gray-700 mt-3">
          Best Match: {analysis.matches[0].brand} {analysis.matches[0].shadeName}
        </p>
        {!isPro && <p className="text-center text-[10px] text-gray-400 mt-1">Made with GlamAI ✨</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={downloadCard} className="py-3 rounded-xl bg-black text-white font-bold text-sm hover:bg-pink-600 transition-colors">
          📥 Save My Beauty ID
        </button>
        <button onClick={share} className="py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold text-sm shadow-lg">
          📤 Share My Results
        </button>
      </div>
    </div>
  );
}
