export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getOpenCount } from '@/lib/devlog/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pagePath = searchParams.get('pagePath') || undefined;
    const result = getOpenCount(pagePath);
    return NextResponse.json(result);
  } catch (error) {
    console.error('DevLog count error:', error);
    return NextResponse.json({ openCount: 0, totalCount: 0 });
  }
}
