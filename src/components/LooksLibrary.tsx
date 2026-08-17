'use client';

import { useState } from 'react';
import { track } from '@/lib/track';

interface LooksLibraryProps {
  analysis: any;
  isPro?: boolean;
  onUnlock?: () => void;
}

interface Step { t: string; d: string; c?: string }

export default function LooksLibrary({ analysis, isPro, onUnlock }: LooksLibraryProps) {
  const [open, setOpen] = useState<string | null>('everyday');

  const pal: string[] = analysis?.seasonColors || analysis?.palette || ['#b08968', '#a06a3f', '#e06666', '#5c3a21', '#8d6a7a', '#fff2cc'];
  const base = analysis?.matches?.[0];
  const season: string = analysis?.season || 'Autumn';

  const LOOKS: { id: string; name: string; emoji: string; mins: number; level: string; pro: boolean; steps: Step[] }[] = [
    {
      id: 'everyday', name: 'Everyday Glow', emoji: '🌤️', mins: 10, level: 'Beginner', pro: false,
      steps: [
        { t: 'Prep', d: 'Moisturizer + SPF. Wait 2 minutes - hydrated skin holds makeup.' },
        { t: 'Base', d: base ? `Sheer layer of ${base.brand} ${base.shadeName}: dot center of face, blend outward.` : 'Sheer layer of your matched foundation: dot center, blend outward.' },
        { t: 'Brows', d: 'Brush hairs up, fill sparse spots with tiny hair-like strokes.' },
        { t: 'Eyes', d: `One wash of shade ${pal[1]} across the lid + one coat mascara.`, c: pal[1] },
        { t: 'Cheeks', d: `Smile, tap ${pal[2]} on the apples, blend up.`, c: pal[2] },
        { t: 'Lips', d: 'Your power shade, blotted with a tissue = natural stain.' },
      ],
    },
    {
      id: 'office', name: 'Office Polished', emoji: '💼', mins: 15, level: 'Intermediate', pro: true,
      steps: [
        { t: 'Prep', d: 'Moisturizer + gripping primer on the T-zone.' },
        { t: 'Base', d: (base ? `${base.brand} ${base.shadeName}` : 'Your foundation') + ' + concealer one shade lighter under eyes in a triangle.' },
        { t: 'Set', d: 'Press translucent powder ONLY on the T-zone - keep cheeks dewy.' },
        { t: 'Brows', d: 'Map inner-arch-tail (like your Live Mirror), set with gel.' },
        { t: 'Eyes', d: `Matte ${pal[1]} lid, ${pal[3]} crease, thin brown liner, mascara.`, c: pal[3] },
        { t: 'Cheeks', d: `${pal[2]} slightly higher than usual = lifted look.`, c: pal[2] },
        { t: 'Lips', d: 'Satin lip in your power shade - blotted, then re-applied thin.' },
      ],
    },
    {
      id: 'party', name: 'Party Glam', emoji: '🪩', mins: 25, level: 'Advanced', pro: true,
      steps: [
        { t: 'Prep', d: 'Full prime: face + lids. Glam needs grip.' },
        { t: 'Base', d: 'Full coverage base + concealer, set everything but the high points.' },
        { t: 'Contour', d: 'Your Live Mirror contour lines: cream contour, blend edges only.' },
        { t: 'Eyes', d: `${pal[1]} lid, ${pal[3]} crease, ${pal[4]} outer V, shimmer ${pal[5]} center lid. Wing it.`, c: pal[4] },
        { t: 'Highlight', d: 'Gold dots from your mirror: cheekbone, nose, brow bone.' },
        { t: 'Cheeks', d: `${pal[2]} layered cream-then-powder = survives dancing.`, c: pal[2] },
        { t: 'Lips', d: 'Line + fill power shade, add gloss center-bottom only.' },
        { t: 'Lock', d: 'One mist of setting spray, arms length away.' },
      ],
    },
    {
      id: 'bridal', name: 'Bridal Soft', emoji: '👰', mins: 35, level: 'Pro-artist', pro: true,
      steps: [
        { t: 'Prep', d: 'Hydrating mask 5 min, then moisturizer + primer. Photography loves skin.' },
        { t: 'Base', d: 'Medium coverage, thin layers. Keep it flashback-safe.' },
        { t: 'Brows', d: 'Softer than usual - one shade lighter strokes, brushed up.' },
        { t: 'Eyes', d: `Waterproof everything: ${pal[1]} lid, ${pal[3]} soft crease, tightline only.`, c: pal[3] },
        { t: 'Cheeks', d: `${pal[2]} cream blush + matching powder = 12-hour wear.`, c: pal[2] },
        { t: 'Lips', d: 'Line full, fill power shade, blot, re-line, re-fill = kiss-proof.' },
        { t: 'Finish', d: 'Micro-highlight inner eye corner only. Tears will happen.' },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 text-left space-y-3">
      <p className="font-extrabold text-gray-900 text-lg">📚 Looks Library - your {season} curriculum</p>
      <p className="text-xs text-gray-500 -mt-2">Full parlor routines, personalized to your season. Tap a look to open its recipe.</p>
      {LOOKS.map((look) => {
        const locked = look.pro && !isPro;
        const isOpen = open === look.id;
        return (
          <div key={look.id} className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => {
                if (locked) { onUnlock && onUnlock(); return; }
                setOpen(isOpen ? null : look.id);
                track('look_open', { look: look.id });
              }}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50"
            >
              <span className="font-bold text-gray-800 text-sm">{look.emoji} {look.name}</span>
              <span className="text-[10px] text-gray-500 font-bold">{locked ? '🔒 PRO' : `${look.mins} min • ${look.level}`}</span>
            </button>
            {isOpen && !locked && (
              <div className="p-4 space-y-2">
                {look.steps.map((s, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-pink-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-gray-800">{s.t}:</span> {s.d}
                      {s.c && <span className="inline-block w-3 h-3 rounded-full ml-1 align-middle border border-white/30" style={{ backgroundColor: s.c }}></span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[10px] text-gray-400 text-center">Free = Everyday Glow • PRO = all 4 looks</p>
    </div>
  );
}
