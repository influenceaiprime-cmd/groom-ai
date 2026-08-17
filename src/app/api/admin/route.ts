import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

// 1. LOGIN CHECK
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }
    return NextResponse.json({ success: true });
  } catch { 
    return NextResponse.json({ error: 'Bad request' }, { status: 400 }); 
  }
}

// 2. FETCH LIVE DATA (Events + Config)
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabaseAdmin) return NextResponse.json({ events: [], config: {} });

  const { data: events } = await supabaseAdmin
    .from('events').select('*').order('created_at', { ascending: false }).limit(50);
  
  const { data: settings } = await supabaseAdmin
    .from('settings').select('*').eq('key', 'config').single();

  return NextResponse.json({ events: events || [], config: settings?.value || {} });
}

// 3. UPDATE SETTINGS (Kill switches, prices, banner)
export async function PUT(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const newConfig = await req.json();
  if (!supabaseAdmin) return NextResponse.json({ error: 'DB missing' }, { status: 500 });

  await supabaseAdmin
    .from('settings')
    .update({ value: newConfig, updated_at: new Date().toISOString() })
    .eq('key', 'config');
    
  return NextResponse.json({ success: true });
}
