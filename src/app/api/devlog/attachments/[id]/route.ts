export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAttachment, deleteAttachment } from '@/lib/devlog/db';

/** Sanitize a filename for use in Content-Disposition header (ASCII-only) */
function sanitizeHeaderFilename(name: string): string {
  // Replace non-ASCII characters with underscores
  return name.replace(/[^\x20-\x7E]/g, '_');
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid attachment ID' }, { status: 400 });
    }

    const result = getAttachment(numericId);

    if (!result) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    const buf = Buffer.isBuffer(result.data) ? result.data : Buffer.from(result.data);
    const safeFilename = sanitizeHeaderFilename(result.attachment.originalName);
    const encodedFilename = encodeURIComponent(result.attachment.originalName);

    return new Response(buf as unknown as BodyInit, {
      headers: {
        'Content-Type': result.attachment.mimeType,
        'Content-Disposition': `inline; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': String(buf.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('DevLog get attachment error:', error);
    return NextResponse.json({ error: 'Failed to get attachment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = deleteAttachment(parseInt(id, 10));
    if (!success) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DevLog delete attachment error:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
