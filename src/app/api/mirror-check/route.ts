import { NextRequest, NextResponse } from 'next/server';
import { visionCompletion } from '@/lib/aiProviders';

const SYSTEM_PROMPT = `You are a professional makeup artist reviewing a photo of someone's makeup application.
Give brief, kind, specific feedback (2-3 sentences max) - point out ONE thing that could be improved (blending, symmetry, product placement, etc.) and ONE thing that looks good. Be encouraging, not clinical. If the makeup looks great overall, say so warmly and skip inventing a flaw.`;

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json();

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    const { text, provider } = await visionCompletion(
      SYSTEM_PROMPT,
      'Please review this makeup application and give me quick feedback.',
      image,
      mediaType || 'image/jpeg'
    );

    return NextResponse.json({ feedback: text, provider });
  } catch (err) {
    console.error('mirror-check route error:', err);
    return NextResponse.json({ error: 'check failed' }, { status: 500 });
  }
}
