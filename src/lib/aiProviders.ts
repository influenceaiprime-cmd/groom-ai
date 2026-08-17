// Central fallback chain: Gemini -> Qwen -> Claude -> DeepSeek
// Each provider supports multiple comma-separated keys; if one key fails
// (rate limit, exhausted quota, invalid), the next key for that provider is tried
// before moving on to the next provider entirely.

interface ChatMsg { role: 'user' | 'assistant'; content: string }

const QWEN_BASE_URL = 'https://ws-1h3uwxq7zzaqi7st.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions';

function getKeys(envVar: string): string[] {
  const raw = process.env[envVar] || '';
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

async function tryKeys<T>(keys: string[], fn: (key: string) => Promise<T>): Promise<T> {
  if (keys.length === 0) throw new Error('no keys configured');
  let lastErr: unknown;
  for (const key of keys) {
    try {
      return await fn(key);
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error('all keys failed');
}

// ---------- GEMINI ----------
async function callGemini(system: string, messages: ChatMsg[]): Promise<string> {
  const keys = getKeys('GEMINI_API_KEYS').length ? getKeys('GEMINI_API_KEYS') : getKeys('GEMINI_API_KEY');
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  return tryKeys(keys, async (key) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents }),
      }
    );
    if (!res.ok) throw new Error(`gemini failed: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('gemini empty response');
    return text;
  });
}

async function callGeminiVision(system: string, prompt: string, base64Image: string, mediaType: string): Promise<string> {
  const keys = getKeys('GEMINI_API_KEYS').length ? getKeys('GEMINI_API_KEYS') : getKeys('GEMINI_API_KEY');
  return tryKeys(keys, async (key) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mediaType, data: base64Image } }, { text: prompt }] }],
        }),
      }
    );
    if (!res.ok) throw new Error(`gemini vision failed: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('gemini vision empty response');
    return text;
  });
}

// ---------- QWEN (using your workspace-specific endpoint) ----------
async function callQwen(system: string, messages: ChatMsg[]): Promise<string> {
  const keys = getKeys('QWEN_API_KEYS').length ? getKeys('QWEN_API_KEYS') : getKeys('QWEN_API_KEY');
  return tryKeys(keys, async (key) => {
    const res = await fetch(QWEN_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'qwen-plus', messages: [{ role: 'system', content: system }, ...messages] }),
    });
    if (!res.ok) throw new Error(`qwen failed: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('qwen empty response');
    return text;
  });
}

async function callQwenVision(system: string, prompt: string, base64Image: string, mediaType: string): Promise<string> {
  const keys = getKeys('QWEN_API_KEYS').length ? getKeys('QWEN_API_KEYS') : getKeys('QWEN_API_KEY');
  return tryKeys(keys, async (key) => {
    const res = await fetch(QWEN_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64Image}` } },
            { type: 'text', text: prompt },
          ] },
        ],
      }),
    });
    if (!res.ok) throw new Error(`qwen vision failed: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('qwen vision empty response');
    return text;
  });
}

// ---------- CLAUDE ----------
async function callClaude(system: string, messages: ChatMsg[]): Promise<string> {
  const keys = getKeys('ANTHROPIC_API_KEYS').length ? getKeys('ANTHROPIC_API_KEYS') : getKeys('ANTHROPIC_API_KEY');
  return tryKeys(keys, async (key) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, system, messages }),
    });
    if (!res.ok) throw new Error(`claude failed: ${res.status}`);
    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === 'text')?.text;
    if (!text) throw new Error('claude empty response');
    return text;
  });
}

async function callClaudeVision(system: string, prompt: string, base64Image: string, mediaType: string): Promise<string> {
  const keys = getKeys('ANTHROPIC_API_KEYS').length ? getKeys('ANTHROPIC_API_KEYS') : getKeys('ANTHROPIC_API_KEY');
  return tryKeys(keys, async (key) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`claude vision failed: ${res.status}`);
    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === 'text')?.text;
    if (!text) throw new Error('claude vision empty response');
    return text;
  });
}

// ---------- DEEPSEEK (text only) ----------
async function callDeepSeek(system: string, messages: ChatMsg[]): Promise<string> {
  const keys = getKeys('DEEPSEEK_API_KEYS').length ? getKeys('DEEPSEEK_API_KEYS') : getKeys('DEEPSEEK_API_KEY');
  return tryKeys(keys, async (key) => {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: system }, ...messages] }),
    });
    if (!res.ok) throw new Error(`deepseek failed: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('deepseek empty response');
    return text;
  });
}

// ---------- PUBLIC ENTRY POINTS ----------
export async function chatCompletion(system: string, messages: ChatMsg[]): Promise<{ text: string; provider: string }> {
  const chain: [string, () => Promise<string>][] = [
    ['gemini', () => callGemini(system, messages)],
    ['qwen', () => callQwen(system, messages)],
    ['claude', () => callClaude(system, messages)],
    ['deepseek', () => callDeepSeek(system, messages)],
  ];
  const errors: string[] = [];
  for (const [name, fn] of chain) {
    try {
      return { text: await fn(), provider: name };
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }
  throw new Error(`all providers failed - ${errors.join(' | ')}`);
}

export async function visionCompletion(
  system: string,
  prompt: string,
  base64Image: string,
  mediaType: string
): Promise<{ text: string; provider: string }> {
  const chain: [string, () => Promise<string>][] = [
    ['gemini', () => callGeminiVision(system, prompt, base64Image, mediaType)],
    ['qwen', () => callQwenVision(system, prompt, base64Image, mediaType)],
    ['claude', () => callClaudeVision(system, prompt, base64Image, mediaType)],
  ];
  const errors: string[] = [];
  for (const [name, fn] of chain) {
    try {
      return { text: await fn(), provider: name };
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }
  throw new Error(`all vision providers failed - ${errors.join(' | ')}`);
}
