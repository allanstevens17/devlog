export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getEntry, updateEntry, deleteEntry } from '@/lib/devlog/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const entry = getEntry(entryId);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (error) {
    console.error('DevLog get entry error:', error);
    return NextResponse.json({ error: 'Failed to get entry' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const body = await request.json();
    const entry = updateEntry(entryId, body);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (error) {
    console.error('DevLog update entry error:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const success = deleteEntry(entryId);
    if (!success) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DevLog delete entry error:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
