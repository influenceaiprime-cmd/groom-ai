'use client';

import { useState } from 'react';
import { useConfig } from '@/lib/useConfig';
import { track } from '@/lib/track';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  headline?: string;
  monthly?: number;
  yearly?: number;
}

export default function PaywallModal({ open, onClose, onUnlock, headline, monthly = 4.99, yearly = 19.99 }: PaywallModalProps) {
  const config = useConfig();
  const [isYearly, setIsYearly] = useState(true);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const save = Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));

  if (!open) return null;

  const tryCode = async () => {
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        track('pro_unlock', { via: 'access_code' });
        onUnlock();
      } else {
        setCodeError('Invalid code, beautiful.');
      }
    } catch {
      setCodeError('Network hiccup - try again.');
    }
  };

  const whopHref = config.whopLink;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full relative shadow-2xl overflow-hidden">
        <div className="relative h-28">
          <img src="https://images.unsplash.com/photo-1512496015851-a90fb3838798?auto=format&fit=crop&w=1600&q=80" alt="GlamAI luxury studio" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1216] via-[#1e1216]/30 to-transparent"></div>
          <button onClick={onClose} className="absolute top-3 right-3 text-white text-xl bg-black/40 rounded-full w-8 h-8">✕</button>
          <p className="absolute bottom-1 left-0 right-0 text-center text-2xl">👑</p>
        </div>
        <div className="p-6 pt-3">
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mt-1">
            {headline || 'Unlock Your Personal Beauty AI'}
          </h2>
          <p className="text-center text-sm text-gray-500 mt-1">
            Everything the big apps have. Plus everything they don't. Half the price.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li>✅ Unlimited 12-Season Color Scans</li>
            <li>✅ All Foundation Matches + Undertone Report</li>
            <li>✅ Full 4-Step AR Mirror Tutor</li>
            <li>✅ No-Watermark Video Exports</li>
          </ul>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsYearly(false)}
              className={`rounded-xl border-2 p-3 text-center ${!isYearly ? 'border-[#b76e79] bg-[#b76e79]/10' : 'border-gray-200'}`}
            >
              <p className="font-bold text-gray-900">${monthly}</p>
              <p className="text-xs text-gray-500">per month</p>
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`rounded-xl border-2 p-3 text-center ${isYearly ? 'border-[#b76e79] bg-[#b76e79]/10' : 'border-gray-200'}`}
            >
              <p className="font-bold text-gray-900">${yearly}</p>
              <p className="text-xs text-gray-500">per year (save {save}%)</p>
            </button>
          </div>

          {whopHref ? (
            <a href={whopHref} target="_blank" rel="noopener noreferrer" onClick={() => track('whop_click', { plan: isYearly ? 'yearly' : 'monthly' })} className="mt-4 w-full block text-center py-3 rounded-full bg-gradient-to-r from-[#7a2b3d] to-[#b76e79] text-white font-extrabold shadow-lg hover:scale-105 transition-transform">
              👑 Get PRO on Whop
            </a>
          ) : null}

          <div className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
              placeholder="Have an access code?"
              className="flex-1 px-4 py-2 rounded-full border border-gray-200 text-sm bg-transparent text-gray-700 focus:outline-none focus:border-[#b76e79]"
            />
            <button onClick={tryCode} className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-[#b76e79] transition-colors">
              Unlock
            </button>
          </div>
          {codeError && <p className="text-xs text-red-500 text-center mt-1">{codeError}</p>}

          <p className="text-[10px] text-center text-gray-400 mt-2">
            Secure checkout by Whop - buy once, enter your code, shine forever.
          </p>
        </div>
      </div>
    </div>
  );
}
