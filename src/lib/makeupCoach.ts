import { SkinAnalysis } from '@/types';

export interface CoachStep {
  step: string;
  tip: string;
}

export interface CoachPlan {
  greeting: string;
  season: string;
  seasonEmoji: string;
  seasonColors: string[];
  jewelry: string;
  routine: CoachStep[];
  recommendedLipNames: string[];
  avoid: string;
  signoff: string;
}

export function buildCoachPlan(a: SkinAnalysis): CoachPlan {
  const light = ['Fair', 'Light', 'Light-Medium'].includes(a.toneCategory);
  const cool = a.undertone === 'cool';

  const season = cool ? (light ? 'Summer' : 'Winter') : (light ? 'Spring' : 'Autumn');
  const seasonEmoji = season === 'Spring' ? '🌸' : season === 'Summer' ? '🌊' : season === 'Autumn' ? '🍂' : '❄️';

  const seasonColors =
    season === 'Spring' ? ['Coral', 'Peach', 'Golden Yellow', 'Warm Turquoise'] :
    season === 'Summer' ? ['Soft Pink', 'Lavender', 'Powder Blue', 'Mint'] :
    season === 'Autumn' ? ['Olive', 'Rust', 'Mustard', 'Terracotta'] :
    ['True Red', 'Royal Blue', 'Emerald', 'Hot Pink'];

  const jewelry = a.undertone === 'warm' ? 'Gold — it makes your skin glow ✨' :
    a.undertone === 'cool' ? 'Silver — crisp and perfect on you ✨' :
    'BOTH gold and silver — neutral undertones are rare luck! ✨';

  const best = a.matches[0];
  const blush = cool ? 'soft pink or berry' : 'peach or coral';
  const highlight = cool ? 'an icy pearl shimmer' : 'a golden champagne glow';

  const routine: CoachStep[] = [
    { step: 'Prep', tip: 'Moisturize, then wait 2 minutes before makeup. Hydrated skin = flawless base.' },
    { step: 'Foundation', tip: `Your perfect match: ${best.brand} ${best.shadeName} (${best.matchScore}% match). Dot on the center of your face, blend outward.` },
    { step: 'Concealer', tip: 'Pick ONE shade lighter than your foundation. Brighten under-eyes in a triangle, not just a line.' },
    { step: 'Blush', tip: `Your undertone loves ${blush}. Smile and sweep it on the apples of your cheeks.` },
    { step: 'Highlight', tip: `Finish the cheeks with ${highlight} on the high points of your face.` },
    { step: 'Lips', tip: 'Tap a recommended shade below to try it on LIVE 💄' },
  ];

  const recommendedLipNames = cool
    ? ['Berry Muse', 'Pink Crush', 'Mauve Mist', 'Ruby Kiss']
    : a.undertone === 'warm'
    ? ['Coral Sunset', 'Nude Bliss', 'Chocolate Silk', 'Scarlet Dream']
    : ['Scarlet Dream', 'Mauve Mist', 'Pink Crush', 'Nude Bliss'];

  const avoid = cool
    ? 'Super orange corals can clash with your cool undertone — lean into berry and pink families.'
    : a.undertone === 'warm'
    ? 'Very blue-based pinks can look gray on warm skin — lean into coral, red and chocolate tones.'
    : 'Honestly? Very few shades fight a neutral undertone. Experiment freely, queen!';

  return {
    greeting: `Hey beautiful! 💖 I scanned your ${a.toneCategory} skin with ${a.undertone} undertones and I am OBSESSED. Here is your personal game plan:`,
    season,
    seasonEmoji,
    seasonColors,
    jewelry,
    routine,
    recommendedLipNames,
    avoid,
    signoff: 'Remember: makeup is play, not perfection. Now go shine, queen! 👑',
  };
}
