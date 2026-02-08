export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getEntry, addAttachment } from '@/lib/devlog/db';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;

    // Verify entry exists
    const entry = getEntry(entryId);
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const attachment = addAttachment(entryId, {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      buffer,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('DevLog upload attachment error:', error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
