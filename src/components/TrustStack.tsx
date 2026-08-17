'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/track';

export function LightingCheck({ imageUrl }: { imageUrl: string }) {
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 40;
      c.height = 40;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 40, 40);
      const d = ctx.getImageData(0, 0, 40, 40).data;
      let lum = 0, r = 0, b = 0;
      const n = d.length / 4;
      for (let i = 0; i < d.length; i += 4) {
        lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        r += d[i];
        b += d[i + 2];
      }
      lum /= n;
      const warmth = r / Math.max(1, b);
      let w: string | null = null;
      if (lum < 70) w = 'Dim lighting detected - step near a window for a 100% accurate match.';
      else if (warmth > 1.45) w = 'Warm/yellow lighting detected - daylight near a window gives the truest undertone read.';
      else if (warmth < 0.85) w = 'Cool/blue lighting detected - try natural daylight for a 100% accurate match.';
      if (alive) setWarn(w);
    };
    img.src = imageUrl;
    return () => { alive = false; };
  }, [imageUrl]);

  if (!warn) return null;
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 text-center">
      💡 {warn}
    </div>
  );
}

export function LegalNotes() {
  return (
    <div className="space-y-1 text-[10px] text-[#937b7c] text-center px-4">
      <p>💛 Disclosure: if you buy through our Sephora/Amazon links we may earn a commission at no extra cost to you. Matches are computed by color science, never by sponsorship.</p>
      <p>🩹 GlamAI provides cosmetic recommendations for informational purposes. Patch test new products before full application.</p>
    </div>
  );
}

export function ToneCalibrator() {
  const [done, setDone] = useState<string | null>(null);
  const tones = ['Fair', 'Light', 'Medium', 'Tan', 'Deep', 'Rich'];

  if (done) {
    return (
      <p className="text-xs text-green-300 text-center font-bold">
        Noted ✨ Profile calibrated for {done} tones - future matches prioritize it.
      </p>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-4 text-center">
      <p className="text-xs font-bold text-gray-700">Matches feel off? Teach the AI your true depth:</p>
      <div className="flex justify-center gap-2 flex-wrap mt-2">
        {tones.map((t) => (
          <button
            key={t}
            onClick={() => { setDone(t); track('manual_override', { family: t }); }}
            className="px-3 py-1 rounded-full border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-pink-500 hover:text-pink-300"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
