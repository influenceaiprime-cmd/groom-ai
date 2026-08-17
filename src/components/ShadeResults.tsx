'use client';

import { SkinAnalysis } from '@/types';
import { amazonLink, sephoraLink } from '@/lib/affiliate';

interface ShadeResultsProps {
  analysis: SkinAnalysis;
  isPro?: boolean;
  onUnlock?: () => void;
}

export default function ShadeResults({ analysis, isPro, onUnlock }: ShadeResultsProps) {
  const hiddenCount = (analysis.totalMatches ?? analysis.matches.length) - analysis.matches.length;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 text-left space-y-6 border border-pink-100">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <div
          className="w-16 h-16 rounded-full border-4 border-white shadow-lg flex-shrink-0"
          style={{ backgroundColor: analysis.skinToneHex }}
        ></div>
        <div>
          <p className="text-xs font-bold text-pink-600 uppercase tracking-wide">Your Scientific Skin Profile</p>
          <p className="text-xl font-extrabold text-gray-900">
            {analysis.toneCategory} • <span className="capitalize">{analysis.undertone}</span> Undertone
          </p>
          <p className="text-sm text-gray-500 font-mono">{analysis.skinToneHex}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">🏆 Your Exact Foundation Matches</h3>
        <div className="space-y-3">
          {analysis.matches.map((match, idx) => {
            const query = `${match.brand} ${match.productName} ${match.shadeName}`;
            return (
              <div key={idx} className="relative">
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border ${idx === 0 ? 'bg-pink-50 border-pink-200 shadow-md' : 'bg-gray-50 border-transparent'}`}
                >
                  <div className="w-12 h-12 rounded-lg shadow-inner border border-gray-200 flex-shrink-0" style={{ backgroundColor: match.hexColor }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{match.brand}</p>
                    <p className="text-xs text-gray-600 truncate">{match.productName} - {match.shadeName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${match.matchScore > 90 ? 'text-green-700 bg-green-100' : 'text-yellow-700 bg-yellow-100'}`}>
                        {match.matchScore}% Match
                      </span>
                      {idx === 0 && <span className="text-[10px] font-bold text-pink-700 bg-pink-200 px-2 py-0.5 rounded-full">BEST MATCH</span>}
                      <span className="text-xs font-semibold text-gray-700">{match.price}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <a href={sephoraLink(query)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-black text-white text-[10px] font-bold rounded-full text-center hover:bg-pink-600 transition-colors">
                      SEPHORA
                    </a>
                    <a href={amazonLink(query)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full text-center hover:bg-amber-600 transition-colors">
                      AMAZON
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {!isPro && hiddenCount > 0 && (
            <button
              onClick={onUnlock}
              className="w-full py-4 text-center font-bold text-gray-900 text-sm bg-pink-50 rounded-xl border border-dashed border-pink-300 hover:bg-pink-100 transition-colors"
            >
              🔒 Unlock {hiddenCount} more match{hiddenCount > 1 ? 'es' : ''} - Go Pro
            </button>
          )}
        </div>
      </div>

      <p className="text-[10px] text-center text-gray-400 pt-2">
        * Matches calculated using CIELAB DeltaE color distance algorithms.
      </p>
    </div>
  );
}
