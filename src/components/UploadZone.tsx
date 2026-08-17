'use client';

import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';

interface UploadZoneProps {
  onImageUpload: (file: File) => void;
}

export default function UploadZone({ onImageUpload }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [consent, setConsent] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    setConsent(localStorage.getItem('glamai_consent') === '1');
  }, []);

  const giveConsent = () => {
    localStorage.setItem('glamai_consent', '1');
    track('consent_given');
    setConsent(true);
  };

  const handleFiles = (files: FileList | null) => {
    if (files && files[0] && files[0].type.startsWith('image/')) onImageUpload(files[0]);
  };

  if (!consent) {
    return (
      <div className="rounded-3xl border border-[#b76e79]/30 bg-white/5 p-8 text-center backdrop-blur-xl space-y-3">
        <p className="text-3xl">🔒</p>
        <p className="text-white font-bold">Your face stays on your device</p>
        <p className="text-xs text-gray-400">
          Scans run 100% in your browser - never uploaded, never stored. Read our{' '}
          <a href="/privacy" className="text-[#e8b4bc] underline">Privacy Policy</a>.
        </p>
        <label className="flex items-start gap-2 text-left text-xs text-gray-300 bg-black/30 rounded-xl p-3 cursor-pointer">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-pink-500" />
          I consent to GlamAI processing my facial scan ON MY DEVICE for shade matching, in accordance with the Privacy Policy.
        </label>
        <button
          disabled={!agree}
          onClick={giveConsent}
          className="w-full py-3 rounded-full bg-gradient-to-r from-[#7a2b3d] to-[#b76e79] text-white font-extrabold disabled:opacity-40"
        >
          Continue to my scan ✨
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all backdrop-blur-xl ${drag ? 'border-[#b76e79] bg-[#b76e79]/10 scale-[1.01]' : 'border-[#b76e79]/30 bg-white/5 hover:border-[#b76e79]/60 hover:bg-white/10'}`}
    >
      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7a2b3d] to-[#b76e79] flex items-center justify-center text-3xl shadow-lg shadow-[#b76e79]/30">📸</div>
      <p className="mt-4 text-lg font-bold text-white">Upload your selfie</p>
      <p className="mt-1 text-sm text-gray-400">Drag & drop or click to browse • JPG, PNG, WEBP</p>
      <p className="mt-3 text-[11px] font-bold text-[#e8b4bc] bg-[#b76e79]/10 border border-[#b76e79]/25 rounded-full px-3 py-1 inline-block">
        💡 Natural light = most accurate match
      </p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}
