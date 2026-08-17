'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/track';

export function RescanPrompt() {
  const [weeks, setWeeks] = useState<number | null>(null);
  useEffect(() => {
    const last = Number(localStorage.getItem('glamai_last_scan') || 0);
    if (!last) return;
    const w = Math.floor((Date.now() - last) / (7 * 24 * 3600 * 1000));
    if (w >= 4) setWeeks(w);
  }, []);
  if (weeks === null) return null;
  return (
    <div className="rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-4 py-3 text-center text-xs font-bold text-[#f3d9a4]">
      🍂 Skin drifts with the seasons - it has been {weeks} weeks since your last scan. Rescan to refresh your Beauty ID.
    </div>
  );
}

export function OxidationNote() {
  return (
    <p className="text-[10px] text-[#937b7c] text-center px-4">
      ⏳ Oxidation check: most liquid foundations dry down ~half a shade deeper after 10-30 min on skin. Between two shades? Pick the lighter one - especially if your T-zone gets shiny.
    </p>
  );
}

export function WearTimePredictor() {
  const [skin, setSkin] = useState<string | null>(null);
  const verdict: Record<string, string> = {
    Shiny: 'Oily-leaning: matte formulas hold ~8h on you. Dewy finishes may separate after ~4h without a mattifying primer on the T-zone.',
    Comfortable: 'Balanced: any finish holds 6-8h. Lock the T-zone with powder if you are out past hour 6.',
    Tight: 'Dry-leaning: dewy and satin hold ~8h on you. Heavy powders may look patchy after ~5h - prep with rich moisturizer.',
  };
  if (skin) {
    return (
      <div className="bg-white rounded-2xl p-4 text-center">
        <p className="text-xs font-bold text-gray-700">⏱️ Wear-time prediction for {skin.toLowerCase()} skin:</p>
        <p className="text-xs text-gray-600 mt-1">{verdict[skin]}</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-4 text-center">
      <p className="text-xs font-bold text-gray-700">⏱️ How does your skin feel by 2pm?</p>
      <div className="flex justify-center gap-2 mt-2">
        {['Shiny', 'Comfortable', 'Tight'].map((s) => (
          <button
            key={s}
            onClick={() => { setSkin(s); track('skin_type', { type: s }); }}
            className="px-3 py-1 rounded-full border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-pink-500 hover:text-pink-300"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
