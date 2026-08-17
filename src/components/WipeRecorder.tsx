'use client';

import { useState } from 'react';

interface WipeRecorderProps {
  imageUrl: string;
  isPro?: boolean;
}

export default function WipeRecorder({ imageUrl, isPro }: WipeRecorderProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'done' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('glamai-wipe.webm');

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });

  const recordVideo = async () => {
    if (status === 'recording') return;
    setStatus('recording');
    setVideoUrl(null);
    try {
      const img = await loadImage(imageUrl);
      const W = 1080;
      const H = 1920;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      const stream = c.captureStream(30);
      const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
        .find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
      if (!mime) throw new Error('unsupported');
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: mime });
          const ext = mime.includes('mp4') ? 'mp4' : 'webm';
          setFileName(`glamai-wipe.${ext}`);
          setVideoUrl(URL.createObjectURL(blob));
          setStatus('done');
        } catch (e) {
          setStatus('error');
          setTimeout(() => setStatus('idle'), 5000);
        }
      };

      const drawCover = (image: HTMLImageElement, filter?: string) => {
        ctx.save();
        if (filter) ctx.filter = filter;
        const scale = Math.max(W / image.width, H / image.height);
        const dw = image.width * scale;
        const dh = image.height * scale;
        ctx.drawImage(image, (W - dw) / 2, (H - dh) / 2, dw, dh);
        ctx.restore();
      };

      const DURATION = 5000;
      const start = performance.now();
      rec.start();

      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        const x = ((8 + t * 84) / 100) * W;
        ctx.clearRect(0, 0, W, H);
        drawCover(img);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, 0, W - x, H);
        ctx.clip();
        drawCover(img, 'saturate(1.25) brightness(1.07) contrast(1.06)');
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 4, 0, 8, H);
        ctx.beginPath();
        ctx.arc(x, H / 2, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#db2777';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⟷', x, H / 2);
        ctx.fillStyle = '#db2777';
        ctx.font = 'bold 64px sans-serif';
        ctx.fillText('GlamAI', W / 2, 130);
        if (!isPro) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = 'bold 34px sans-serif';
          ctx.fillText('Made with GlamAI', W / 2, H - 90);
        }
        if (t < 1) requestAnimationFrame(frame);
        else setTimeout(() => rec.stop(), 200);
      };
      requestAnimationFrame(frame);
    } catch (e) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  if (status === 'done' && videoUrl) {
    return (
      <div className="space-y-2">
        <a
          href={videoUrl}
          download={fileName}
          className="block w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-extrabold text-lg shadow-lg hover:scale-105 transition-transform text-center"
        >
          ⬇️ DOWNLOAD MY VIDEO
        </a>
        <p className="text-[11px] text-gray-400 text-center">Saves as {fileName} - drag it into Chrome to watch, or upload straight to TikTok.</p>
      </div>
    );
  }

  const label =
    status === 'recording' ? '✨ Rendering your 5s transformation...' :
    status === 'error' ? '😅 Not supported here - try Chrome' :
    '🎬 Record 5s Wipe Video (TikTok Ready)';

  return (
    <button
      onClick={recordVideo}
      disabled={status === 'recording'}
      className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-extrabold text-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-60"
    >
      {label}
    </button>
  );
}
