'use client';

import { useEffect, useRef, useState } from 'react';
import BeardStudio from '@/components/BeardStudio';
import WhyGroomAI from '@/components/WhyGroomAI';
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
    <main className="min-h-screen pb-16" style={{ background: 'var(--ink-0)' }}>
      <header className="max-w-2xl mx-auto px-4 pt-8 pb-5 flex items-center justify-between">
        <div>
          <p className="text-lg tracking-[0.15em] uppercase" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--steel-1)' }}>
            Groom<span style={{ color: 'var(--steel-2)' }}>AI</span>
          </p>
          <p className="text-[9px] tracking-[0.25em] uppercase mt-0.5" style={{ color: 'var(--steel-3)' }}>Est. 2026</p>
        </div>
        <button
          onClick={() => setPaywall(true)}
          className="text-[11px] tracking-wider uppercase px-4 py-1.5 transition-colors"
          style={{ color: 'var(--steel-1)', border: '1px solid var(--hairline)' }}
        >
          {isPro ? 'Pro' : 'Go Pro'}
        </button>
      </header>
      <div className="max-w-2xl mx-auto px-4 nameplate-rule" />

      <div className="max-w-2xl mx-auto px-4 space-y-8 pt-8">
        {!imageUrl && (
          <>
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl leading-tight" style={{ color: '#e4e9ed' }}>
                Free AI can tell you to grow a beard.<br />
                <span style={{ color: 'var(--steel-2)' }}>We show you how it looks on your face.</span>
              </h1>
              <p className="text-sm" style={{ color: 'var(--steel-2)' }}>
                Upload your photo. Try beard styles in ten seconds. Get exact specs for your barber.
                <span style={{ color: 'var(--steel-1)' }}> Your face never leaves your phone.</span>
              </p>
              <p className="text-[11px] tracking-wide mono" style={{ color: 'var(--steel-3)' }}>Free preview · $6.99 one-time · No subscription</p>
            </div>

            {!consent && (
              <div className="p-8 text-center space-y-4" style={{ background: 'var(--ink-1)', border: '1px solid var(--hairline)' }}>
                <p className="text-sm tracking-wider uppercase" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--steel-1)' }}>Your face stays on your device</p>
                <p className="text-xs" style={{ color: 'var(--steel-2)' }}>
                  Scans run entirely in your browser - never uploaded, never stored.{' '}
                  <a href="/privacy" className="underline" style={{ color: 'var(--steel-1)' }}>Privacy Policy</a>
                </p>
                <label className="flex items-start gap-2 text-left text-xs cursor-pointer p-3" style={{ color: 'var(--steel-2)', background: 'rgba(0,0,0,0.3)' }}>
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" style={{ accentColor: 'var(--steel-2)' }} />
                  I consent to GroomAI processing my facial scan on my device for style preview, per the Privacy Policy.
                </label>
                <button
                  disabled={!agree}
                  onClick={() => { localStorage.setItem('groom_consent', '1'); track('consent_given'); setConsent(true); }}
                  className="w-full py-3 tracking-wider uppercase text-sm disabled:opacity-30 transition-opacity"
                  style={{ background: 'var(--steel-2)', color: 'var(--ink-0)' }}
                >
                  Continue to preview
                </button>
              </div>
            )}

            {consent && (
              <div className="space-y-2">
                <div
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer p-10 text-center transition-colors"
                  style={{ border: '1px dashed var(--hairline)', background: 'var(--ink-1)' }}
                >
                  <p className="text-sm tracking-wider uppercase" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--steel-1)' }}>Upload your photo</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--steel-3)' }}>Front-facing, decent light. JPG or PNG.</p>
                  <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                </div>
                {uploadError && <p className="text-xs text-center font-semibold" style={{ color: '#c9807f' }}>{uploadError}</p>}
              </div>
            )}

            <WhyGroomAI />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="p-5" style={{ background: 'var(--ink-1)', border: '1px solid var(--hairline)' }}>
                <p className="text-xs tracking-wider uppercase" style={{ fontFamily: 'Oswald, sans-serif', color: '#a88585' }}>Asking free AI</p>
                <ul className="mt-3 space-y-1.5 text-xs" style={{ color: 'var(--steel-3)' }}>
                  <li>— Paragraphs of generic advice</li>
                  <li>— No visual on your face</li>
                  <li>— Photo stored on their servers</li>
                  <li>— Vague "ask your barber" instructions</li>
                </ul>
              </div>
              <div className="p-5" style={{ background: 'var(--ink-1)', border: '1px solid var(--steel-3)' }}>
                <p className="text-xs tracking-wider uppercase" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--steel-1)' }}>Using GroomAI</p>
                <ul className="mt-3 space-y-1.5 text-xs" style={{ color: 'var(--steel-2)' }}>
                  <li>— See any style on your face in 10s</li>
                  <li>— Exact mm lengths and guard numbers</li>
                  <li>— Barber Card your barber can execute</li>
                  <li>— Face never leaves your device</li>
                </ul>
              </div>
            </div>

            <div className="p-5 text-left space-y-2" style={{ background: 'var(--ink-1)', border: '1px solid var(--hairline)' }}>
              <p className="text-xs tracking-wider uppercase" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--steel-1)' }}>How it works</p>
              <p className="text-xs" style={{ color: 'var(--steel-2)' }}>01 — Upload. Our model maps your jawline, chin, and mouth on-device.</p>
              <p className="text-xs" style={{ color: 'var(--steel-2)' }}>02 — Try styles, stubble to full beard, auto-colored to your hair.</p>
              <p className="text-xs" style={{ color: 'var(--steel-2)' }}>03 — Download the Barber Card: lengths, cheek line, neckline, notes.</p>
              <p className="text-xs" style={{ color: 'var(--steel-2)' }}>04 — Hand it to your barber. Get exactly what you saw.</p>
            </div>
          </>
        )}

        {imageUrl && (
          <div className="space-y-4">
            <BeardStudio imageUrl={imageUrl} isPro={isPro} onUnlock={() => setPaywall(true)} />
            <button onClick={() => { setImageUrl(null); setUploadError(''); }} className="text-xs tracking-wide uppercase" style={{ color: 'var(--steel-3)' }}>← Try another photo</button>
          </div>
        )}

        <footer className="pt-6 text-center space-y-2">
          <div className="space-x-4">
            <a href="/privacy" className="text-[11px] tracking-wide uppercase" style={{ color: 'var(--steel-3)' }}>Privacy Policy</a>
            <a href="/terms" className="text-[11px] tracking-wide uppercase" style={{ color: 'var(--steel-3)' }}>Terms of Service</a>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--steel-3)' }}>GroomAI provides style guidance for informational purposes. Your photo is processed on-device and never stored.</p>
        </footer>
      </div>

      {paywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }} onClick={() => setPaywall(false)}>
          <div className="max-w-sm w-full space-y-4 p-7" style={{ background: 'var(--ink-1)', border: '1px solid var(--hairline)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-lg tracking-wider uppercase" style={{ fontFamily: 'Oswald, sans-serif', color: 'var(--steel-1)' }}>Unlock GroomAI Pro</p>
            <p className="text-xs" style={{ color: 'var(--steel-2)' }}>All beard styles and Barber Card. $6.99 one-time. No subscription, no auto-renewal.</p>
            {config.whopLink ? (
              <a href={config.whopLink} target="_blank" rel="noreferrer" onClick={() => track('checkout_click')} className="block w-full py-3 tracking-wider uppercase text-sm text-center" style={{ background: 'var(--steel-2)', color: 'var(--ink-0)' }}>
                Unlock Pro Now
              </a>
            ) : (
              <p className="text-xs" style={{ color: 'var(--steel-3)' }}>Checkout launching soon - use an access code below.</p>
            )}
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" className="flex-1 px-3 py-2 text-sm" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--hairline)', color: 'var(--steel-1)' }} />
              <button onClick={redeem} disabled={redeeming} className="px-4 text-sm tracking-wide uppercase disabled:opacity-50" style={{ background: 'var(--ink-2)', color: 'var(--steel-1)', border: '1px solid var(--hairline)' }}>
                {redeeming ? '...' : 'Redeem'}
              </button>
            </div>
            {codeMsg && <p className="text-xs" style={{ color: '#c9807f' }}>{codeMsg}</p>}
            <button onClick={() => setPaywall(false)} className="w-full text-xs tracking-wide uppercase" style={{ color: 'var(--steel-3)' }}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
