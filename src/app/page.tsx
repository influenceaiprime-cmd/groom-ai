'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import UploadZone from '@/components/UploadZone';
import { RescanPrompt, OxidationNote, WearTimePredictor } from '@/components/RetentionStack';
import { LightingCheck, LegalNotes, ToneCalibrator } from '@/components/TrustStack';
import ShadeResults from '@/components/ShadeResults';
import MakeupCoach from '@/components/MakeupCoach';
import LooksLibrary from '@/components/LooksLibrary';
import LiveMirror from '@/components/LiveMirror';
import ShareStudio from '@/components/ShareStudio';
import PaletteScanner from '@/components/PaletteScanner';
import WipeRecorder from '@/components/WipeRecorder';
import PaywallModal from '@/components/PaywallModal';
import ChatWidget from '@/components/ChatWidget';
import { useConfig } from '@/lib/useConfig';
import { track } from '@/lib/track';
import { SkinAnalysis } from '@/types';

const FaceDetector = dynamic(() => import('@/components/FaceDetector'), { ssr: false });

export default function Home() {
  const [mode, setMode] = useState<'upload' | 'results' | 'mirror'>('upload');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [lipColor, setLipColor] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [bgOk, setBgOk] = useState(false);
  const config = useConfig();

  const refreshProStatus = () => {
    fetch('/api/me').then(r => r.json()).then(d => setIsPro(!!d.pro)).catch(() => {});
  };

  useEffect(() => {
    refreshProStatus();
    track('visit');
  }, []);

  const effectivePro = isPro || !config.paywallEnabled;

  const openPaywall = () => {
    track('paywall_view');
    setPaywallOpen(true);
  };

  const unlockPro = () => {
    refreshProStatus();
    setPaywallOpen(false);
    track('pro_unlock');
  };

  const handleImageUpload = (file: File) => {
    setImageUrl(URL.createObjectURL(file));
    setAnalysis(null);
    setLipColor(null);
    setMode('results');
    track('upload');
  };

  const handleFaceDetected = async (r: number, g: number, b: number) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r, g, b }),
      });
      const a = await res.json();
      setAnalysis(a);
      track('scan_complete', { hex: a.skinToneHex, undertone: a.undertone, tone: a.toneCategory });
      localStorage.setItem('glamai_last_scan', String(Date.now()));
    } catch {
      track('scan_failed');
    }
  };

  const proTips = analysis ? [
    analysis.undertone === 'cool'
      ? 'Finish: dewy textures & pearl shimmer make your cool undertone glow.'
      : analysis.undertone === 'warm'
      ? 'Finish: satin textures & golden glow flatter your warm undertone.'
      : 'Finish: luminous satin - your neutral undertone pulls off any finish.',
    analysis.toneCategory === 'Deep' || analysis.toneCategory === 'Rich'
      ? 'Prep: rich moisturizer + hydrating primer keep deep tones radiant.'
      : 'Prep: lightweight gel moisturizer + SPF keep your base fresh all day.',
    `Signature shade: ${analysis.matches[0].brand} ${analysis.matches[0].shadeName} - build your capsule makeup bag around it.`,
  ] : [];

  return (
    <main className="min-h-screen pb-20">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1512496015851-a90fb3838798?auto=format&fit=crop&w=1600&q=80"
          alt=""
          onLoad={() => setBgOk(true)}
          onError={() => setBgOk(false)}
          className={`w-full h-full object-cover scale-105 transition-opacity duration-1000 ${bgOk ? 'opacity-100' : 'opacity-0'}`}
        />
        {bgOk && (
          <>
            <div className="absolute inset-0 bg-[#140b0f]/80"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#140b0f]/50 via-[#140b0f]/70 to-[#140b0f]/95"></div>
          </>
        )}
      </div>

      {config.bannerText && (
        <div className="bg-gradient-to-r from-[#7a2b3d] to-[#b76e79] text-white text-center text-sm font-bold py-2 px-4">
          {config.bannerText}
        </div>
      )}

      <nav className="flex items-center justify-between px-5 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-[#b76e79]/40 bg-black inline-block">
            <img src="/logo.png" alt="GlamAI" className="w-full h-full object-cover scale-[1.35]" />
          </span>
          <span className="text-2xl font-extrabold text-[#f6ece6]">
            Glam<span className="bg-gradient-to-r from-[#e9c49f] via-[#e3a2b4] to-[#b76e79] bg-clip-text text-transparent">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isPro && (
            <span className="text-xs font-extrabold bg-gradient-to-r from-[#d4af37] to-[#b76e79] text-white px-3 py-1 rounded-full shadow-md shadow-[#d4af37]/30">PRO 👑</span>
          )}
        </div>
      </nav>

      <header className="relative overflow-hidden text-center pt-6 pb-8 px-4">
        <h1 className="relative text-4xl md:text-5xl font-extrabold text-[#f6ece6] max-w-xl mx-auto leading-tight">
          Your live AI <span className="bg-gradient-to-r from-[#e9c49f] via-[#e3a2b4] to-[#b76e79] bg-clip-text text-transparent italic">makeup coach</span>
        </h1>
        <p className="relative text-lg text-[#c0a8a6] max-w-md mx-auto mt-3">
          Scan, match, glow - science-grade beauty in your pocket.
        </p>
        <div className="relative flex justify-center gap-2 mt-4 flex-wrap">
          <span className="text-[11px] font-bold text-[#e8b4bc] bg-[#b76e79]/10 border border-[#b76e79]/25 px-3 py-1 rounded-full backdrop-blur-md">🧪 CIELAB Science</span>
          <span className="text-[11px] font-bold text-[#f3d9a4] bg-[#d4af37]/20 border border-[#d4af37]/40 px-3 py-1 rounded-full backdrop-blur-md">🎬 Live AR Mirror</span>
          <span className="text-[11px] font-bold text-[#cbb3e3] bg-[#9370db]/10 border border-[#9370db]/25 px-3 py-1 rounded-full backdrop-blur-md">🎨 12-Season ID</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4">
        {mode === 'upload' && (
          <>
            <RescanPrompt />
            <UploadZone onImageUpload={handleImageUpload} />
          </>
        )}

        {mode === 'results' && imageUrl && (
          <div className="space-y-6 text-center">
            <FaceDetector imageUrl={imageUrl} lipColor={lipColor} onFaceDetected={handleFaceDetected} />
            <LightingCheck imageUrl={imageUrl} />
            {analysis && <ShadeResults analysis={analysis} isPro={effectivePro} onUnlock={openPaywall} />}
            {analysis && <OxidationNote />}
            {analysis && <WearTimePredictor />}
            {analysis && <LegalNotes />}
            {analysis && <ToneCalibrator />}
            {analysis && <MakeupCoach analysis={analysis} selectedLip={lipColor} onLipSelect={setLipColor} isPro={effectivePro} onUnlock={openPaywall} />}
            {analysis && <LooksLibrary analysis={analysis} isPro={effectivePro} onUnlock={openPaywall} />}
            {analysis && isPro && (
              <div className="rounded-2xl p-[2px] bg-gradient-to-r from-[#d4af37] via-[#b76e79] to-[#7a2b3d] shadow-xl shadow-[#b76e79]/20">
                <div className="bg-white rounded-2xl p-5 text-left space-y-2">
                  <p className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-[#b76e79]">👑 PRO Glam Report</p>
                  {proTips.map((t, i) => (
                    <p key={i} className="text-sm text-gray-700">✨ {t}</p>
                  ))}
                </div>
              </div>
            )}
            {analysis && config.scannerEnabled && <PaletteScanner isPro={effectivePro} onUnlock={openPaywall} />}
            {analysis && <ShareStudio imageUrl={imageUrl} analysis={analysis} isPro={effectivePro} />}
            {analysis && config.videoEnabled && <WipeRecorder imageUrl={imageUrl} isPro={effectivePro} />}
            {analysis && config.mirrorEnabled && (
              <button
                onClick={() => { track('mirror_open'); setMode('mirror'); }}
                className="w-full py-4 bg-gradient-to-r from-[#7a2b3d] to-[#b76e79] text-white rounded-xl font-extrabold text-lg shadow-lg shadow-[#b76e79]/30 hover:scale-105 transition-transform"
              >
                🎬 TRY LIVE MIRROR MODE
              </button>
            )}
            <button
              onClick={() => { setImageUrl(null); setAnalysis(null); setLipColor(null); setMode('upload'); }}
              className="w-full py-3 bg-white/5 border border-white/10 text-[#ddc9c5] rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Try Another Photo
            </button>
          </div>
        )}

        {mode === 'mirror' && (
          <div className="space-y-4 text-center">
            <LiveMirror selectedLip={lipColor} isPro={effectivePro} onUnlock={openPaywall} />
            <button
              onClick={() => setMode('results')}
              className="w-full py-3 bg-white/5 border-2 border-[#b76e79] text-[#e8b4bc] rounded-xl font-bold hover:bg-[#b76e79]/10"
            >
              ← Back to Results
            </button>
          </div>
        )}
      </div>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlock={unlockPro}
        headline={config.paywallHeadline}
        monthly={config.proMonthly}
        yearly={config.proYearly}
      />
      <ChatWidget analysis={analysis} isPro={effectivePro} />
      <footer className="max-w-2xl mx-auto px-4 pt-6 text-center space-x-4">
        <a href="/privacy" className="text-[11px] text-[#937b7c] hover:text-[#e8b4bc]">Privacy Policy</a>
        <a href="/terms" className="text-[11px] text-[#937b7c] hover:text-[#e8b4bc]">Terms of Service</a>
        <p className="block text-[10px] text-[#6b5560] pt-2">GlamAI provides cosmetic recommendations for informational purposes. Patch test new products before full application.</p>
      </footer>
    </main>
  );
}
