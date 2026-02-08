/**
 * DevLog Client API
 *
 * Fetch-based client for the DevLog API routes.
 * No axios dependency — keeps DevLog self-contained.
 */

import type {
  DevLogEntry,
  Attachment,
  CreateEntryDto,
  UpdateEntryDto,
  EntryListResponse,
  CountResponse,
  EntryType,
} from './types';

const BASE = '/api/devlog';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DevLog API error ${res.status}: ${body}`);
  }
  return res.json();
}

export const devlogApi = {
  // --- Entries ---

  listEntries: async (params?: {
    pagePath?: string;
    type?: EntryType;
    includeComplete?: boolean;
  }): Promise<EntryListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.pagePath) searchParams.set('pagePath', params.pagePath);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.includeComplete === false) searchParams.set('includeComplete', 'false');
    const qs = searchParams.toString();
    return fetchJson(`${BASE}/entries${qs ? `?${qs}` : ''}`);
  },

  getEntry: async (entryId: string): Promise<DevLogEntry> => {
    return fetchJson(`${BASE}/entries/${entryId}`);
  },

  createEntry: async (data: CreateEntryDto): Promise<DevLogEntry> => {
    return fetchJson(`${BASE}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  updateEntry: async (entryId: string, data: UpdateEntryDto): Promise<DevLogEntry> => {
    return fetchJson(`${BASE}/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  deleteEntry: async (entryId: string): Promise<void> => {
    await fetch(`${BASE}/entries/${entryId}`, { method: 'DELETE' });
  },

  // --- Attachments ---

  uploadAttachment: async (entryId: string, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchJson(`${BASE}/entries/${entryId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteAttachment: async (id: number): Promise<void> => {
    await fetch(`${BASE}/attachments/${id}`, { method: 'DELETE' });
  },

  getAttachmentUrl: (id: number): string => `${BASE}/attachments/${id}`,

  // --- Count ---

  getCount: async (pagePath?: string): Promise<CountResponse> => {
    const qs = pagePath ? `?pagePath=${encodeURIComponent(pagePath)}` : '';
    return fetchJson(`${BASE}/count${qs}`);
  },

  // --- Export ---

  exportEntries: async (format: 'json' | 'markdown'): Promise<void> => {
    const url = `${BASE}/export?format=${format}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ext = format === 'markdown' ? 'md' : 'json';
    const date = new Date().toISOString().split('T')[0];
    a.download = `devlog-export-${date}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  },
};
