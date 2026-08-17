// 🔑 FOUNDER CONFIG: paste your affiliate tags here when you join the programs
// Amazon Associates: affiliate.amazon.com -> get a tag like 'glamai-20'
// Sephora: join via Skimlinks/Rakuten -> they auto-tag your links
export const AMAZON_TAG = '';

export function amazonLink(query: string): string {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  return AMAZON_TAG ? `${base}&tag=${AMAZON_TAG}` : base;
}

export function sephoraLink(query: string): string {
  return `https://www.sephora.com/search?keyword=${encodeURIComponent(query)}`;
}
