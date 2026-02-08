export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { exportAllEntries } from '@/lib/devlog/db';
import { ENTRY_TYPE_LABELS, PRIORITY_LABELS } from '@/lib/devlog/types';
import type { DevLogEntry } from '@/lib/devlog/types';

function toMarkdown(entries: DevLogEntry[]): string {
  const lines: string[] = ['# DevLog Export', ''];
  const now = new Date().toISOString().split('T')[0];
  lines.push(`Exported: ${now}`, `Total entries: ${entries.length}`, '');

  // Group by page
  const byPage = new Map<string, DevLogEntry[]>();
  for (const entry of entries) {
    const existing = byPage.get(entry.pagePath) || [];
    existing.push(entry);
    byPage.set(entry.pagePath, existing);
  }

  for (const [pagePath, pageEntries] of byPage) {
    lines.push(`## ${pagePath}`, '');

    for (const entry of pageEntries) {
      const status = entry.isComplete ? 'Complete' : 'Open';
      const priority = entry.priority ? ` | **Priority**: ${PRIORITY_LABELS[entry.priority]}` : '';
      lines.push(`### [${entry.entryId}] ${entry.title}`);
      lines.push(`**Type**: ${ENTRY_TYPE_LABELS[entry.type]}${priority} | **Status**: ${status}`);
      lines.push(`**Created**: ${entry.createdAt}`);
      lines.push('');

      if (entry.description) {
        lines.push(entry.description);
        lines.push('');
      }

      if (entry.attachments.length > 0) {
        lines.push('**Attachments:**');
        for (const att of entry.attachments) {
          if (att.filePath) {
            const relativePath = `.devlog/uploads/${entry.entryId}/${att.filename}`;
            if (att.mimeType.startsWith('image/')) {
              lines.push(`- Image: \`${relativePath}\``);
            } else {
              lines.push(`- File: \`${relativePath}\` (read with \`cat ${relativePath}\`)`);
            }
          } else {
            lines.push(`- ${att.originalName} (${att.mimeType}, stored as blob)`);
          }
        }
        lines.push('');
      }

      lines.push('---', '');
    }
  }

  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const entries = exportAllEntries();

    if (format === 'markdown') {
      const markdown = toMarkdown(entries);
      const date = new Date().toISOString().split('T')[0];
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="devlog-export-${date}.md"`,
        },
      });
    }

    // JSON export
    const date = new Date().toISOString().split('T')[0];
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
      entries,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="devlog-export-${date}.json"`,
      },
    });
  } catch (error) {
    console.error('DevLog export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
