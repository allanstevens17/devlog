// DevLog Types — shared between client and server

export type EntryType = 'change_request' | 'bug_report' | 'note';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type StorageType = 'filesystem' | 'blob';

export interface DevLogEntry {
  id: number;
  entryId: string;
  type: EntryType;
  title: string;
  description: string;
  priority: Priority | null;
  isComplete: boolean;
  submittedBy: string | null;
  pageUrl: string;
  pagePath: string;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: number;
  entryId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageType: StorageType;
  filePath: string | null;
  createdAt: string;
}

export interface CreateEntryDto {
  type: EntryType;
  title: string;
  description?: string;
  priority?: Priority;
  submittedBy?: string;
  pageUrl: string;
  pagePath: string;
  userAgent?: string;
}

export interface UpdateEntryDto {
  title?: string;
  description?: string;
  priority?: Priority | null;
  isComplete?: boolean;
}

export interface EntryListResponse {
  entries: DevLogEntry[];
  total: number;
  openCount: number;
}

export interface CountResponse {
  openCount: number;
  totalCount: number;
}

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  change_request: 'Change Request',
  bug_report: 'Bug Report',
  note: 'Note',
};

export const ENTRY_TYPE_PREFIX: Record<EntryType, string> = {
  change_request: 'CR',
  bug_report: 'BUG',
  note: 'NOTE',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ALLOWED_TEXT_EXTENSIONS = [
  '.md', '.txt', '.jsx', '.tsx', '.ts', '.js',
  '.doc', '.docx', '.json', '.css', '.html', '.yaml', '.yml',
];
