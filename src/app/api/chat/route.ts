import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/aiProviders';

const SYSTEM_PROMPT = `You are the GlamAI Beauty Coach, a warm, knowledgeable makeup and skincare assistant built into the GlamAI app.

Guidelines:
- Keep answers short and conversational (2-4 sentences usually), like a friendly expert texting back, not an essay.
- If the user has a skin analysis on file (provided below), use it to personalize advice - reference their undertone, tone category, or matched shades naturally.
- You can discuss: foundation/concealer matching, undertones, skincare basics, application techniques, product types, color theory for makeup.
- You are not a dermatologist. For anything medical (persistent acne, rashes, allergic reactions, skin conditions), suggest seeing a dermatologist rather than diagnosing.
- Never invent specific product names/shades that aren't in the user's provided match data - if asked about specific products you don't have data on, be honest that you don't have that specific info.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history, analysisContext } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    const contextBlock = analysisContext
      ? `\n\nUser's current skin analysis: ${JSON.stringify(analysisContext)}`
      : '';

    const messages = [
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: 'user', content: message },
    ];

    const { text, provider } = await chatCompletion(SYSTEM_PROMPT + contextBlock, messages);
    return NextResponse.json({ reply: text, provider });
  } catch (err) {
    console.error('chat route error:', err);
    return NextResponse.json({ error: 'chat failed' }, { status: 500 });
  }
}
