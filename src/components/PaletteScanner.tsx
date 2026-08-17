'use client';

import { useRef, useState } from 'react';
import { extractPalette, PaletteZones } from '@/lib/paletteScanner';

interface PaletteScannerProps {
  isPro?: boolean;
  onUnlock?: () => void;
}

export default function PaletteScanner({ isPro, onUnlock }: PaletteScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [zones, setZones] = useState<PaletteZones | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!isPro) {
      const used = parseInt(localStorage.getItem('glamai_scans') || '0', 10);
      if (used >= 1) {
        onUnlock && onUnlock();
        return;
      }
      localStorage.setItem('glamai_scans', String(used + 1));
    }
    setStatus('Scanning your palette...');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const z = extractPalette(d.data, c.width, c.height);
      if (z) {
        setZones(z);
        setStatus(null);
      } else {
        setStatus("Couldn't detect shades. Try a brighter, straight-on photo.");
      }
    };
    img.src = url;
  };

  const steps = zones ? [
    { name: 'Step 1: Base', hex: zones.base, tip: 'Sweep across the entire lid and brow bone to prime your canvas.' },
    { name: 'Step 2: Crease', hex: zones.crease, tip: 'Blend into the crease with windshield-wiper motions.' },
    { name: 'Step 3: Outer V', hex: zones.outerV, tip: 'Deepen the outer corner for dimension and lift.' },
    { name: 'Step 4: Pop', hex: zones.shimmer, tip: 'Press onto the center of the lid with your fingertip.' },
  ] : [];

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 text-left border border-purple-100 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-800">🎨 Scan My Makeup Bag</h3>
        <p className="text-xs text-gray-500 mt-1">Snap your palette - get a 4-step tutorial using ONLY your shades.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:scale-105 transition-transform"
      >
        📸 Scan a Palette
      </button>

      {status && <p className="text-sm text-gray-600 text-center">{status}</p>}

      {zones && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {zones.all.map((hex, i) => (
              <div key={i} className="h-9 flex-1 rounded-lg border border-gray-200 shadow-inner" style={{ backgroundColor: hex }}></div>
            ))}
          </div>
          {steps.map((s) => (
            <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-md flex-shrink-0" style={{ backgroundColor: s.hex }}></div>
              <div>
                <p className="text-sm font-bold text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-600">{s.tip}</p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-center text-gray-400">Tutorial built 100% from YOUR palette.</p>
        </div>
      )}
    </div>
  );
}
