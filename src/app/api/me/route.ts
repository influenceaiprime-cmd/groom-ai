import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const pro = req.cookies.get('glamai_pro')?.value === '1';
  return NextResponse.json({ pro });
}
