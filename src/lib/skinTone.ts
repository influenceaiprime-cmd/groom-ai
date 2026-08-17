import { FOUNDATION_DATABASE } from './foundationData';
import { SkinAnalysis, FoundationMatch } from '@/types';

// Helper to convert Hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// 🧪 SCIENTIFIC UPGRADE: RGB to CIELAB Conversion
function rgbToLab(r: number, g: number, b: number) {
  let rr = r / 255, gg = g / 255, bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  
  let x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
  let y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750) / 1.00000;
  let z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;

  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + 16/116;
  x = f(x); y = f(y); z = f(z);

  return {
    l: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}

// DeltaE (CIE76 distance - standard for cosmetics)
function deltaE(lab1: any, lab2: any) {
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

export function analyzeSkinTone(r: number, g: number, b: number): SkinAnalysis {
  const lab = rgbToLab(r, g, b);
  const hex = '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();

  // Scientific Undertone
  let undertone: 'warm' | 'cool' | 'neutral' = 'neutral';
  if (lab.b > lab.a + 5) undertone = 'warm';
  else if (lab.a > lab.b + 2) undertone = 'cool';

  // Tone Category based on Lightness (L)
  let toneCategory = 'Medium';
  if (lab.l > 75) toneCategory = 'Fair';
  else if (lab.l > 65) toneCategory = 'Light';
  else if (lab.l > 55) toneCategory = 'Light-Medium';
  else if (lab.l > 45) toneCategory = 'Medium';
  else if (lab.l > 35) toneCategory = 'Medium-Deep';
  else if (lab.l > 25) toneCategory = 'Deep';
  else toneCategory = 'Rich';

  // Match against database using Lab Distance (DeltaE)
  const matches: FoundationMatch[] = FOUNDATION_DATABASE.map(shade => {
    const shadeRgb = hexToRgb(shade.hexColor);
    const shadeLab = rgbToLab(shadeRgb.r, shadeRgb.g, shadeRgb.b);
    const dist = deltaE(lab, shadeLab);
    
    // Match % formula (closer to 0 distance = 100%)
    const matchScore = Math.max(0, Math.min(100, Math.round(100 - (dist * 3.5))));
    
    return { ...shade, matchScore };
  })
  .sort((a, b) => b.matchScore - a.matchScore)
  .slice(0, 6);

  return { 
    faceDetected: true,
    skinToneHex: hex, 
    hex,
    rgb: { r, g, b },
    lab,
    undertone, 
    toneCategory, 
    matches 
  };
}
