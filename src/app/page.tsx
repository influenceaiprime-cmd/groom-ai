'use client';

import { useEffect, useRef, useState } from 'react';
import BeardStudio from '@/components/BeardStudio';
import { useConfig } from '@/lib/useConfig';
import { track } from '@/lib/track';

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [agree, setAgree] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const config = useConfig();

  useEffect(() => {
    setConsent(localStorage.getItem('groom_consent') === '1');
    fetch('/api/me').then((r) => r.json()).then((d) => setIsPro(!!d.pro)).catch(() => {});
    track('visit');
  }, []);

  const handleFile = (f: File | null) => {
    setUploadError('');
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setUploadError('That doesn\'t look like an image - try a JPG or PNG.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setUploadError('Could not read that file - try again.');
    reader.onload = () => { setImageUrl(reader.result as string); track('upload'); };
    reader.readAsDataURL(f);
  };

  const redeem = async () => {
    if (redeeming) return;
    setRedeeming(true);
    setCodeMsg('');
    try {
      const r = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (r.ok) { setIsPro(true); setPaywall(false); setCodeMsg(''); }
      else setCodeMsg('Invalid code.');
    } catch {
      setCodeMsg('Network hiccup - try again.');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <main className="min-h-screen pb-16">
      <header className="max-w-2xl mx-auto px-4 pt-6 pb-4 flex items-center justify-between">
        <p className="text-xl font-black text-white">🧔 Groom<span className="text-amber-400">AI</span></p>
        <button onClick={() => setPaywall(true)} className="text-xs font-bold text-amber-300 border border-amber-500/40 rounded-full px-3 py-1 hover:bg-amber-500/10">
          {isPro ? 'PRO ✓' : 'Go PRO'}
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {!imageUrl && (
          <>
            <div className="text-center space-y-3 pt-4">
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Free AI can tell you to grow a beard.<br />
                <span className="text-amber-400">We show you how it looks on YOUR face.</span>
              </h1>
              <p className="text-sm text-gray-400">
                Upload your photo. Try beard styles in 10 seconds. Get exact specs for your barber.
                <span className="text-amber-300 font-bold"> Your face never leaves your phone.</span>
              </p>
              <p className="text-[11px] text-gray-500 font-bold">Free preview • $6.99 to unlock everything • No subscription</p>
            </div>

            {!consent && (
              <div className="rounded-3xl border border-amber-500/30 bg-[#111827] p-8 text-center space-y-3">
                <p className="text-3xl">🔒</p>
                <p className="text-white font-bold">Your face stays on your device</p>
                <p className="text-xs text-gray-400">
                  Scans run 100% in your browser - never uploaded, never stored.{' '}
                  <a href="/privacy" className="text-amber-400 underline">Privacy Policy</a>
                </p>
                <label className="flex items-start gap-2 text-left text-xs text-gray-300 bg-black/30 rounded-xl p-3 cursor-pointer">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-amber-500" />
                  I consent to GroomAI processing my facial scan ON MY DEVICE for style preview, per the Privacy Policy.
                </label>
                <button
                  disabled={!agree}
                  onClick={() => { localStorage.setItem('groom_consent', '1'); track('consent_given'); setConsent(true); }}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-extrabold disabled:opacity-40"
                >
                  Continue to my preview ⚡
                </button>
              </div>
            )}

            {consent && (
              <div className="space-y-2">
                <div
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer rounded-3xl border-2 border-dashed border-amber-500/30 bg-[#111827] p-10 text-center hover:border-amber-500/60 transition-colors"
                >
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-3xl shadow-lg shadow-amber-600/20">🧔</div>
                  <p className="mt-4 text-lg font-bold text-white">Upload your photo</p>
                  <p className="mt-1 text-sm text-gray-400">Front-facing, decent light. JPG or PNG.</p>
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                </div>
                {uploadError && <p className="text-xs text-red-400 text-center font-semibold">{uploadError}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="bg-[#111827] rounded-2xl p-5 border border-red-500/20">
                <p className="font-extrabold text-red-400">Asking Free AI</p>
                <ul className="mt-2 space-y-1 text-xs text-gray-400">
                  <li>❌ Paragraphs of generic advice</li>
                  <li>❌ No visual on YOUR face</li>
                  <li>❌ Photo stored on their servers</li>
                  <li>❌ Vague "ask your barber" instructions</li>
                </ul>
              </div>
              <div className="bg-[#111827] rounded-2xl p-5 border border-amber-500/30">
                <p className="font-extrabold text-amber-400">Using GroomAI</p>
                <ul className="mt-2 space-y-1 text-xs text-gray-400">
                  <li>✅ See any style on YOUR face in 10s</li>
                  <li>✅ Exact mm lengths + guard numbers</li>
                  <li>✅ Barber Card your barber can execute</li>
                  <li>✅ Face never leaves your device</li>
                </ul>
              </div>
            </div>

            <div className="bg-[#111827] rounded-2xl p-5 text-left space-y-2">
              <p className="font-extrabold text-white">How it works - 10 seconds</p>
              <p className="text-xs text-gray-400">1. Upload → AI maps your jawline, chin, and mouth on-device.</p>
              <p className="text-xs text-gray-400">2. Try styles - stubble to full beard - auto-colored to YOUR hair.</p>
              <p className="text-xs text-gray-400">3. Download the Barber Card: lengths, cheek line, neckline, notes.</p>
              <p className="text-xs text-gray-400">4. Hand it to your barber. Get exactly what you saw.</p>
            </div>
          </>
        )}

        {imageUrl && (
          <div className="space-y-4">
            <BeardStudio imageUrl={imageUrl} isPro={isPro} onUnlock={() => setPaywall(true)} />
            <button onClick={() => { setImageUrl(null); setUploadError(''); }} className="text-xs text-gray-500 hover:text-amber-300 font-bold">← Try another photo</button>
          </div>
        )}

        <footer className="pt-6 text-center space-y-2">
          <div className="space-x-4">
            <a href="/privacy" className="text-[11px] text-gray-500 hover:text-amber-300">Privacy Policy</a>
            <a href="/terms" className="text-[11px] text-gray-500 hover:text-amber-300">Terms of Service</a>
          </div>
          <p className="text-[10px] text-gray-600">GroomAI provides style guidance for informational purposes. Your photo is processed on-device and never stored.</p>
        </footer>
      </div>

      {paywall && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={() => setPaywall(false)}>
          <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-xl font-extrabold text-white">🧔 Unlock GroomAI PRO</p>
            <p className="text-xs text-gray-400">All beard styles + Barber Card. $6.99 one-time. No subscription. No auto-renewal.</p>
            {config.whopLink ? (
              <a href={config.whopLink} target="_blank" rel="noreferrer" onClick={() => track('checkout_click')} className="block w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-extrabold text-center">
                👑 Unlock PRO Now
              </a>
            ) : (
              <p className="text-xs text-gray-500">Checkout launching soon - use an access code below.</p>
            )}
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" className="flex-1 bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white" />
              <button onClick={redeem} disabled={redeeming} className="px-4 rounded-xl bg-gray-700 text-white font-bold text-sm disabled:opacity-50">
                {redeeming ? '...' : 'Redeem'}
              </button>
            </div>
            {codeMsg && <p className="text-xs text-red-400">{codeMsg}</p>}
            <button onClick={() => setPaywall(false)} className="w-full text-xs text-gray-500">Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
