'use client';
import { SkinAnalysis } from '@/types';
import { buildCoachPlan } from '@/lib/makeupCoach';
import { LIPSTICK_SHADES } from '@/lib/lipstickData';

interface MakeupCoachProps {
  analysis: SkinAnalysis;
  selectedLip: string | null;
  onLipSelect: (hex: string) => void;
  isPro?: boolean;
  onUnlock?: () => void;
}

export default function MakeupCoach({ analysis, selectedLip, onLipSelect, isPro, onUnlock }: MakeupCoachProps) {
  const plan = buildCoachPlan(analysis);
  return (
    <div className="mt-8 bg-white rounded-2xl shadow-lg overflow-hidden text-left">
      <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-6 text-white">
        <h3 className="text-2xl font-extrabold">💄 Your AI Makeup Coach</h3>
        <p className="mt-2 text-pink-50">{plan.greeting}</p>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-pink-100 bg-pink-50 p-4">
            <p className="font-bold text-gray-800">Your Color Season</p>
            <p className="text-2xl mt-1">{plan.seasonEmoji} {plan.season}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {plan.seasonColors.map(c => (
                <span key={c} className="text-xs bg-white border border-pink-200 rounded-full px-2 py-1">{c}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border-2 border-yellow-100 bg-yellow-50 p-4">
            <p className="font-bold text-gray-800">Your Metal</p>
            <p className="mt-1 text-gray-700">{plan.jewelry}</p>
          </div>
        </div>
        <div>
          <p className="font-bold text-gray-800 mb-3">Your Personal Routine</p>
          <ol className="space-y-3">
            {plan.routine.map((r, i) => (
              <li key={r.step} className="flex gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-pink-500 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <div>
                  <p className="font-semibold text-gray-800">{r.step}</p>
                  <p className="text-sm text-gray-600">{r.tip}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl bg-rose-50 border-2 border-rose-100 p-4">
          <p className="font-bold text-rose-600">⚠️ Coach's Warning</p>
          <p className="text-sm text-gray-700 mt-1">{plan.avoid}</p>
        </div>
        <div>
          <p className="font-bold text-gray-800">💋 Your Power Shades — tap to try on LIVE</p>
          <div className="flex flex-wrap gap-3 mt-3">
            {LIPSTICK_SHADES.map(s => {
              const rec = plan.recommendedLipNames.includes(s.name);
              const locked = !isPro && !rec;
              const active = selectedLip === s.hex;
              return (
                <button
                  key={s.name}
                  onClick={() => (locked ? onUnlock && onUnlock() : onLipSelect(s.hex))}
                  title={locked ? `${s.name} - unlock with Pro` : `${s.name} - ${s.vibe}`}
                  className={`relative w-12 h-12 rounded-full border-4 transition-transform ${active ? 'border-pink-500 scale-110' : 'border-white shadow hover:scale-105'} ${locked ? 'opacity-40 grayscale' : ''}`}
                  style={{ backgroundColor: s.hex }}
                >
                  {rec && <span className="absolute -top-2 -right-2 text-sm">⭐</span>}
                  {locked && <span className="absolute inset-0 flex items-center justify-center text-xs">🔒</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">⭐ = coach's picks for your undertone (free) • 🔒 = unlock all shades with Pro</p>
        </div>
        <p className="text-center font-semibold text-pink-600">{plan.signoff}</p>
      </div>
    </div>
  );
}
