import { NextRequest, NextResponse } from 'next/server';
import { analyzeSkinTone } from '@/lib/skinTone';

export async function POST(req: NextRequest) {
  try {
    const { r, g, b } = await req.json();

    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    const isPro = req.cookies.get('glamai_pro')?.value === '1';
    const analysis = analyzeSkinTone(r, g, b);
    const matches = isPro ? analysis.matches : analysis.matches.slice(0, 1);

    return NextResponse.json({
      ...analysis,
      matches,
      totalMatches: analysis.matches.length,
    });
  } catch {
    return NextResponse.json({ error: 'analysis failed' }, { status: 400 });
  }
}
