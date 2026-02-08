export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAttachment, deleteAttachment } from '@/lib/devlog/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = getAttachment(parseInt(id, 10));

    if (!result) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.data), {
      headers: {
        'Content-Type': result.attachment.mimeType,
        'Content-Disposition': `inline; filename="${result.attachment.originalName}"`,
        'Content-Length': String(result.data.length),
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
