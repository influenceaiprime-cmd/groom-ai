export interface FaceDetection {
  detected: boolean;
  skinTone: string;
  undertone: 'warm' | 'cool' | 'neutral' | 'unknown';
  hexColor: string;
  confidence: number;
}

export interface FoundationMatch {
  brand: string;
  productName: string;
  shadeName: string;
  shadeCode: string;
  hexColor: string;
  matchScore: number;
  price: string;
  url: string;
}

export interface SkinAnalysis {
  faceDetected: boolean;
  skinToneHex: string;
  undertone: string;
  toneCategory: string;
  matches: FoundationMatch[];
  hex?: string;
  rgb?: { r: number; g: number; b: number };
  lab?: { l: number; a: number; b: number };
  totalMatches?: number;
}
