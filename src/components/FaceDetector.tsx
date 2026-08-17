'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window { faceapi: any; }
}

interface FaceDetectorProps {
  imageUrl: string;
  lipColor?: string | null;
  onFaceDetected: (avgR: number, avgG: number, avgB: number) => void;
}

export default function FaceDetector({ imageUrl, lipColor, onFaceDetected }: FaceDetectorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const lipPointsRef = useRef<{ x: number; y: number }[] | null>(null);
  const [status, setStatus] = useState<string>('Loading AI engine...');
  const [ready, setReady] = useState(false);

  // 🛡️ ANTI-FAKE GUARDS
  const MIN_DETECTION_SCORE = 0.75; // Must be 75% sure it's a face
  const MIN_FACE_SIZE = 80;         // Face box must be at least 80x80 pixels
  const MIN_SKIN_PIXELS = 200;      // Must find at least 200 real skin pixels

  useEffect(() => {
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      if (window.faceapi) {
        clearInterval(timer);
        try {
          const fa = window.faceapi;
          await fa.tf.setBackend('webgl');
          await fa.tf.ready();
          await fa.nets.tinyFaceDetector.loadFromUri('/models');
          await fa.nets.faceLandmark68Net.loadFromUri('/models');
          setReady(true);
          setStatus('AI ready! Detecting face...');
        } catch (e) {
          setStatus('Error loading AI models.');
          console.error(e);
        }
      } else if (tries > 50) {
        clearInterval(timer);
        setStatus('AI engine failed to load. Check internet.');
      }
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const drawLips = () => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pts = lipPointsRef.current;
    if (!lipColor || !pts || pts.length < 12) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = lipColor;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  useEffect(() => {
    drawLips();
  }, [lipColor, ready]);

  const computeWhiteBalanceFactors = (ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    const stride = 8;
    const d = ctx.getImageData(0, 0, width, height).data;
    let sumR = 0, sumG = 0, sumB = 0, n = 0;
    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const i = (y * width + x) * 4;
        sumR += d[i]; sumG += d[i + 1]; sumB += d[i + 2];
        n++;
      }
    }
    if (n === 0) return { fr: 1, fg: 1, fb: 1 };
    const avgR = sumR / n, avgG = sumG / n, avgB = sumB / n;
    const avgGray = (avgR + avgG + avgB) / 3;
    const clamp = (v: number) => Math.max(0.85, Math.min(1.15, v));
    return {
      fr: avgR > 0 ? clamp(avgGray / avgR) : 1,
      fg: avgG > 0 ? clamp(avgGray / avgG) : 1,
      fb: avgB > 0 ? clamp(avgGray / avgB) : 1,
    };
  };

  const sampleRegion = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number,
    wb: { fr: number; fg: number; fb: number }
  ) => {
    const sx = Math.max(0, Math.min(x, ctx.canvas.width - 1));
    const sy = Math.max(0, Math.min(y, ctx.canvas.height - 1));
    const ss = Math.max(1, Math.min(size, ctx.canvas.width - sx, ctx.canvas.height - sy));
    const d = ctx.getImageData(sx, sy, ss, ss).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const pr = Math.max(0, Math.min(255, d[i] * wb.fr));
      const pg = Math.max(0, Math.min(255, d[i + 1] * wb.fg));
      const pb = Math.max(0, Math.min(255, d[i + 2] * wb.fb));
      const maxC = Math.max(pr, pg, pb);
      const minC = Math.min(pr, pg, pb);
      const isNearWhite = maxC > 240 && (maxC - minC) < 35;
      const isNearGray = (maxC - minC) < 12;
      const basicSkinShape = pr > 50 && pg > 25 && pb > 10 && pr > pg && pr > pb && (pr - pg) > 8;
      if (basicSkinShape && !isNearWhite && !isNearGray) {
        r += pr; g += pg; b += pb; n++;
      }
    }
    return n > 30 ? { r: r / n, g: g / n, b: b / n, n } : null;
  };

  useEffect(() => {
    if (!ready || !imgRef.current || !window.faceapi) return;
    const detectFace = async () => {
      const img = imgRef.current;
      const fa = window.faceapi;
      if (!img) return;
      try {
        let detection = null;
        for (const size of [320, 224, 160]) {
          const opts = new fa.TinyFaceDetectorOptions({ inputSize: size, scoreThreshold: 0.4 });
          detection = await fa.detectSingleFace(img, opts).withFaceLandmarks();
          if (detection && detection.detection) break;
        }
        
        if (!detection || !detection.detection) {
          setStatus('No face found. Please upload a clear selfie.');
          return;
        }

        // 🛡️ Guard 1: Strict Confidence
        const detectionScore = detection.detection.score ?? 0;
        if (detectionScore < MIN_DETECTION_SCORE) {
          setStatus("That doesn't look like a clear face. Please use a real selfie.");
          return;
        }

        // 🛡️ Guard 2: Face Size Check
        const box = detection.detection.box;
        if (box.width < MIN_FACE_SIZE || box.height < MIN_FACE_SIZE) {
          setStatus("Face is too small or fake. Please use a close-up selfie.");
          return;
        }

        setStatus('Face detected! Reading skin tone...');
        
        if (overlayRef.current) {
          const displaySize = { width: img.offsetWidth, height: img.offsetHeight };
          overlayRef.current.width = displaySize.width;
          overlayRef.current.height = displaySize.height;
          const resized = fa.resizeResults(detection, displaySize);
          lipPointsRef.current = resized.landmarks.positions
            .slice(48, 60)
            .map((p: any) => ({ x: p.x, y: p.y }));
        }

        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) { setStatus('Could not read image.'); return; }
        ctx.drawImage(img, 0, 0);

        const wb = computeWhiteBalanceFactors(ctx);
        const w = box.width, h = box.height;
        
        const spots = [
          sampleRegion(ctx, box.x + w * 0.22, box.y + h * 0.55, w * 0.16, wb),
          sampleRegion(ctx, box.x + w * 0.62, box.y + h * 0.55, w * 0.16, wb),
          sampleRegion(ctx, box.x + w * 0.40, box.y + h * 0.20, w * 0.16, wb),
        ].filter(Boolean) as { r: number; g: number; b: number; n: number }[];

        // 🛡️ Guard 3: Real Skin Pixel Count
        const totalSkinPixels = spots.reduce((sum, s) => sum + s.n, 0);
        if (totalSkinPixels < MIN_SKIN_PIXELS) {
          setStatus("I couldn't find real skin in this photo. Please use a real selfie!");
          return;
        }

        const tn = spots.reduce((s, p) => s + p.n, 0);
        const avgR = spots.reduce((s, p) => s + p.r * p.n, 0) / tn;
        const avgG = spots.reduce((s, p) => s + p.g * p.n, 0) / tn;
        const avgB = spots.reduce((s, p) => s + p.b * p.n, 0) / tn;

        setStatus('Analysis complete! Tap a lipstick below to try it on 💄');
        onFaceDetected(avgR, avgG, avgB);
        drawLips();
      } catch (error) {
        console.error('Detection error:', error);
        setStatus('Error reading face. Try another photo.');
      }
    };
    const img = imgRef.current;
    if (img?.complete) detectFace();
    else img?.addEventListener('load', detectFace);
    return () => { img?.removeEventListener('load', detectFace); };
  }, [ready, imageUrl]);

  return (
    <div className="relative">
      <p className="text-center text-sm font-medium text-gray-600 mb-3">{status}</p>
      <div className="relative inline-block">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Your selfie"
          className="max-w-full h-auto rounded-xl shadow-lg"
          style={{ maxHeight: '400px' }}
        />
        <canvas ref={overlayRef} className="absolute top-0 left-0 pointer-events-none" />
      </div>
    </div>
  );
}
