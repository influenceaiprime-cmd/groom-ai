'use client';
import { useEffect, useRef, useState } from 'react';
type FaceShape = 'Oval' | 'Round' | 'Square' | 'Heart';
type EyeShape = 'Almond' | 'Round' | 'Upturned' | 'Downturned';
interface LiveMirrorProps {
  selectedLip: string | null;
  isPro?: boolean;
  onUnlock?: () => void;
}
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
const STEPS = [
  { name: 'Contour', tip: 'Suck in your cheeks - sweep a dark shade along the BROWN lines from ear toward mouth, stop halfway. Blend well.' },
  { name: 'Blush', tip: 'Smile! Tap blush on the PEACH circles (the apples of your cheeks) and blend upward toward your ears.' },
  { name: 'Highlight', tip: 'Dab shimmer on the GOLD dots - cheekbone tops, bridge of nose, brow bone. Light catches exactly there.' },
  { name: 'Brows', tip: 'Brow mapping like an artist: the inner end starts in line with your nose side, the arch peaks over your iris, the tail ends on the diagonal of your outer eye corner. Fill gaps with tiny hair-like strokes, then brush up.' },
  { name: 'Eyes', tip: 'Eyeshadow the pro way: LIGHT base on the lid, MEDIUM shade in the crease, DARKEST on the outer corner V. Blend in small circles - no harsh lines.' },
  { name: 'Lips', tip: 'Your shade, painted live. Line your lips first, then fill in. Screenshot it and go buy it.' },
];
const EYE_TIPS: Record<EyeShape, string> = {
  Almond: 'Your almond eyes: any liner works - try a classic thin wing.',
  Round: 'Round eyes: wing the liner slightly outward to elongate.',
  Upturned: 'Upturned eyes: keep liner thin on the outer half, smudge the lower lash line.',
  Downturned: 'Downturned eyes: flick the wing UP at the outer corner to lift.',
};
export default function LiveMirror({ selectedLip, isPro, onUnlock }: LiveMirrorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Camera is off');
  const [streaming, setStreaming] = useState(false);
  const [step, setStep] = useState(0);
  const [faceShape, setFaceShape] = useState<FaceShape | null>(null);
  const [eyeShape, setEyeShape] = useState<EyeShape | null>(null);
  const [faceFound, setFaceFound] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const stepRef = useRef(0);
  const lipRef = useRef<string | null>(null);
  const shapeDoneRef = useRef(false);
  const eyeDoneRef = useRef(false);
  const shapeCountRef = useRef<Record<string, number>>({});
  const eyeCountRef = useRef<Record<string, number>>({});
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { lipRef.current = selectedLip; }, [selectedLip]);
  const startCamera = async () => {
    setStatus('Opening camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setStreaming(true);
        setStatus('Loading AI brain (first time ~5s)...');
        loadModels();
      }
    } catch (e) {
      setStatus('Camera blocked or unavailable - allow camera in site settings, or use your phone.');
    }
  };
  const loadModels = async () => {
    try {
      const fa = (window as any).faceApi;
      if (!fa) { setStatus('AI script not loaded - refresh the page.'); return; }
      await Promise.all([
        fa.loadTinyFaceDetectorModel(MODEL_URL),
        fa.loadFaceLandmark68Model(MODEL_URL),
      ]);
      runningRef.current = true;
      setStatus('Show your face to the mirror...');
      requestAnimationFrame(loop);
    } catch (e) {
      setStatus('AI brain failed to load - check internet and refresh.');
    }
  };
  const d = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (a: any, b: any) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const classify = (pts: any[]) => {
    if (!shapeDoneRef.current) {
      const top = mid(pts[17], pts[26]);
      const H = d(top, pts[8]);
      const W = d(pts[0], pts[16]);
      const ratio = W / H;
      const jaw = d(pts[4], pts[12]) / d(pts[2], pts[14]);
      let s: FaceShape = 'Oval';
      if (ratio > 0.82 && jaw > 0.78) s = 'Square';
      else if (ratio > 0.82) s = 'Round';
      else if (jaw < 0.62) s = 'Heart';
      const c = shapeCountRef.current;
      c[s] = (c[s] || 0) + 1;
      if (c[s] >= 15) { shapeDoneRef.current = true; setFaceShape(s); }
    }
    if (!eyeDoneRef.current) {
      const width = d(pts[36], pts[39]);
      const height = d(mid(pts[37], pts[38]), mid(pts[41], pts[40]));
      const tilt = (pts[39].y - pts[36].y) / width;
      const ratio = height / width;
      let s: EyeShape = 'Almond';
      if (tilt > 0.08) s = 'Upturned';
      else if (tilt < -0.08) s = 'Downturned';
      else if (ratio > 0.42) s = 'Round';
      const c = eyeCountRef.current;
      c[s] = (c[s] || 0) + 1;
      if (c[s] >= 15) { eyeDoneRef.current = true; setEyeShape(s); }
    }
  };
  const drawGuides = (ctx: CanvasRenderingContext2D, pts: any[]) => {
    const s = stepRef.current;
    ctx.lineCap = 'round';
    if (s === 0) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#8b5a3c';
      ctx.lineWidth = 10;
      const m1 = mid(pts[2], pts[48]);
      const m2 = mid(pts[14], pts[54]);
      ctx.beginPath(); ctx.moveTo(pts[2].x, pts[2].y); ctx.lineTo(m1.x, m1.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pts[14].x, pts[14].y); ctx.lineTo(m2.x, m2.y); ctx.stroke();
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= 16; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (s === 1) {
      const r = d(pts[36], pts[45]) * 0.22;
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#e06666';
      const c1 = mid(pts[48], pts[36]);
      const c2 = mid(pts[54], pts[45]);
      ctx.beginPath(); ctx.arc(c1.x, c1.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(c2.x, c2.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (s === 2) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ffd700';
      const dots = [
        { x: pts[36].x, y: pts[36].y + 8 },
        { x: pts[45].x, y: pts[45].y + 8 },
        mid(pts[27], pts[29]),
        { x: mid(pts[21], pts[22]).x, y: mid(pts[21], pts[22]).y - 8 },
        { x: mid(pts[25], pts[26]).x, y: mid(pts[25], pts[26]).y - 8 },
      ];
      dots.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
    } else if (s === 3) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#4a2f1d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pts[39].x, pts[21].y);
      ctx.quadraticCurveTo(mid(pts[37], pts[38]).x, Math.min(pts[19].y, pts[20].y) - 3, pts[36].x - 5, pts[21].y - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pts[42].x, pts[26].y);
      ctx.quadraticCurveTo(mid(pts[43], pts[44]).x, Math.min(pts[23].y, pts[24].y) - 3, pts[45].x + 5, pts[26].y - 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (s === 4) {
      const w = d(pts[36], pts[39]);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#e8c8a9';
      const e1 = mid(mid(pts[36], pts[39]), mid(pts[37], pts[41]));
      const e2 = mid(mid(pts[42], pts[45]), mid(pts[43], pts[47]));
      ctx.beginPath(); ctx.ellipse(e1.x, e1.y - 4, w * 0.5, w * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(e2.x, e2.y - 4, w * 0.5, w * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#a06a3f';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(e1.x, e1.y - 2, w * 0.55, Math.PI, 2 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(e2.x, e2.y - 2, w * 0.55, Math.PI, 2 * Math.PI); ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#5c3a21';
      ctx.beginPath(); ctx.arc(pts[36].x - 4, pts[36].y - 6, w * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(pts[45].x + 4, pts[45].y - 6, w * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = lipRef.current || '#c2185b';
      ctx.beginPath();
      ctx.moveTo(pts[48].x, pts[48].y);
      for (let i = 49; i <= 59; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
  const loop = async () => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const fa = (window as any).faceApi;
    if (video && canvas && fa && video.readyState >= 2) {
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        try {
          const det = await fa
            .detectSingleFace(video, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
            .withFaceLandmarks();
          if (det && det.landmarks) {
            setFaceFound(true);
            const pts = det.landmarks.positions;
            drawGuides(ctx, pts);
            classify(pts);
            setStatus(STEPS[stepRef.current].name + ' - follow the guides on your face');
          } else {
            setFaceFound(false);
            setStatus('No face found - face a window for light, remove sunglasses, come closer.');
          }
        } catch (e) {}
      }
    }
    requestAnimationFrame(loop);
  };

  const checkMyMakeup = async () => {
    if (!isPro) {
      onUnlock && onUnlock();
      return;
    }
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setCheckError('Camera not ready yet - wait a moment and try again.');
      return;
    }
    setChecking(true);
    setCheckError(null);
    setCheckFeedback(null);
    try {
      // Capture the raw video frame (unflipped, since CSS mirroring is display-only)
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = video.videoWidth;
      captureCanvas.height = video.videoHeight;
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) throw new Error('canvas unavailable');
      ctx.drawImage(video, 0, 0);
      const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];

      const res = await fetch('/api/mirror-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
      });
      const data = await res.json();
      if (data.feedback) {
        setCheckFeedback(data.feedback);
      } else {
        setCheckError("Couldn't check right now - try again in a moment.");
      }
    } catch {
      setCheckError('Network hiccup - try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl aspect-[3/4] max-h-[600px] w-full flex flex-col items-center justify-center">
        {!streaming && (
          <div className="z-10 max-w-sm mx-4 mb-4 text-center bg-black/70 border border-pink-500/30 rounded-2xl p-4 backdrop-blur">
            <p className="text-white font-bold text-sm">✨ Your parlor-quality artist, live</p>
            <p className="text-gray-300 text-xs mt-1">
              GlamAI tracks your face and shows you EXACTLY where to apply contour, blush, highlight, brows, eyeshadow and lipstick - step by step, on your own face. Skip the expensive parlor. Nothing is ever recorded.
            </p>
          </div>
        )}
        {!streaming && (
          <button onClick={startCamera} className="z-20 bg-pink-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-pink-700 transition animate-pulse">
            📸 Start Live Mirror
          </button>
        )}
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: 'scaleX(-1)' }} />
        {streaming && (
          <div className="absolute top-3 left-0 right-0 flex justify-center z-20">
            <p className={`text-xs px-3 py-1 rounded-full ${faceFound ? 'text-green-300 bg-black/60' : 'text-red-300 bg-black/70'}`}>{status}</p>
          </div>
        )}
        {streaming && (faceShape || eyeShape) && (
          <div className="absolute top-12 left-0 right-0 flex justify-center gap-2 z-20">
            {faceShape && <p className="text-[11px] text-amber-300 bg-black/60 px-3 py-1 rounded-full">Face: {faceShape}</p>}
            {eyeShape && <p className="text-[11px] text-purple-300 bg-black/60 px-3 py-1 rounded-full">Eyes: {eyeShape}</p>}
          </div>
        )}
      </div>
      {streaming && (
        <div className="bg-white rounded-2xl p-4 text-center space-y-3">
          <div className="flex justify-center gap-2 flex-wrap">
            {STEPS.map((s, i) => {
              const locked = !isPro && i > 0;
              return (
                <button
                  key={s.name}
                  onClick={() => (locked ? onUnlock && onUnlock() : setStep(i))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${step === i ? 'border-pink-500 bg-pink-500/10 text-pink-300' : 'border-gray-200 text-gray-500'} ${locked ? 'opacity-60' : ''}`}
                >
                  {locked ? '🔒 ' : ''}{i + 1}. {s.name}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-gray-600 font-semibold">{STEPS[step].tip}</p>
          {step === 4 && eyeShape && <p className="text-xs text-purple-300 font-bold">{EYE_TIPS[eyeShape]}</p>}
          <p className="text-[10px] text-gray-400">Free = Contour only • PRO = full 6-step artist</p>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={checkMyMakeup}
              disabled={checking}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:scale-[1.02] transition-transform disabled:opacity-60"
            >
              {checking ? '✨ Checking your makeup...' : isPro ? '🪄 Check My Makeup' : '🔒 Check My Makeup - Go Pro'}
            </button>
            {checkFeedback && (
              <div className="mt-3 text-left bg-pink-50 border border-pink-200 rounded-xl p-3">
                <p className="text-xs font-bold text-pink-600 mb-1">💄 AI Makeup Check</p>
                <p className="text-sm text-gray-700">{checkFeedback}</p>
              </div>
            )}
            {checkError && <p className="text-xs text-red-500 mt-2">{checkError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
