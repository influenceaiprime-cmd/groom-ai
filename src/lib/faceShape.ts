// Calculates face shape based on 68 facial landmarks
export function analyzeFaceShape(pts: any[]) {
  if (!pts || pts.length < 68) return { shape: 'Unknown', advice: 'Upload a clear front-facing photo.' };

  // Helper to get distance between two points
  const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

  // 1. Measurements
  const faceLength = dist(pts[8], pts[27]) * 1.4; // Chin to nose bridge, extrapolated to forehead
  const cheekWidth = dist(pts[0], pts[16]);       // Outer jaw/cheek width
  const jawWidth = dist(pts[4], pts[12]);         // Lower jaw width
  const foreheadWidth = dist(pts[19], pts[24]);   // Eyebrow width (proxy for forehead)

  // 2. Ratios
  const lengthToWidthRatio = faceLength / cheekWidth;
  const jawToCheekRatio = jawWidth / cheekWidth;

  // 3. Classification Logic
  let shape = 'Oval';
  let advice = 'Oval faces are versatile. Try a Short Boxed or Full Beard to maintain your natural balance.';
  let recommendedStyle = 'boxed';

  if (lengthToWidthRatio < 1.15 && jawToCheekRatio > 0.85) {
    shape = 'Round';
    advice = 'Round faces benefit from sharp angles and length. Grow a goatee or a boxed beard with a squared-off chin to elongate your face.';
    recommendedStyle = 'goatee';
  } else if (lengthToWidthRatio < 1.2 && jawToCheekRatio > 0.9) {
    shape = 'Square';
    advice = 'You have a strong, angular jaw. Soften it with a rounded beard shape, or accentuate it with heavy stubble and a clean neckline.';
    recommendedStyle = 'stubble';
  } else if (foreheadWidth < jawWidth * 0.9 && jawWidth < cheekWidth * 0.8) {
    shape = 'Diamond';
    advice = 'Diamond faces have wide cheekbones. Add width to your jawline with a full beard or mutton chops to balance your proportions.';
    recommendedStyle = 'full';
  } else if (lengthToWidthRatio > 1.3) {
    shape = 'Oblong';
    advice = 'Long faces should avoid long chin hair. Stick to short stubble or a boxed beard with fuller sides to widen your face.';
    recommendedStyle = 'stubble';
  }

  return { shape, advice, recommendedStyle };
}
