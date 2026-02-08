export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { listEntries, createEntry } from '@/lib/devlog/db';
import type { EntryType } from '@/lib/devlog/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pagePath = searchParams.get('pagePath') || undefined;
    const type = (searchParams.get('type') as EntryType) || undefined;
    const includeComplete = searchParams.get('includeComplete') !== 'false';

    const result = listEntries({ pagePath, type, includeComplete });
    return NextResponse.json(result);
  } catch (error) {
    console.error('DevLog list entries error:', error);
    return NextResponse.json({ entries: [], total: 0, openCount: 0 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type || !body.title || !body.pageUrl || !body.pagePath) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, pageUrl, pagePath' },
        { status: 400 }
      );
    }

    const entry = createEntry(body);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('DevLog create entry error:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
