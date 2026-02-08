/**
 * DevLog Database Layer
 *
 * Self-contained SQLite database for the DevLog utility.
 * Stores change requests, bug reports, notes, and file attachments.
 * Uses better-sqlite3 for synchronous, zero-dependency local storage.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type {
  DevLogEntry,
  Attachment,
  CreateEntryDto,
  UpdateEntryDto,
  EntryType,
  StorageType,
} from './types';

// Singleton database instance
let db: Database.Database | null = null;

function getDbPath(): string {
  // Go up from frontend/ to project root, then into .devlog/
  return path.resolve(process.cwd(), '..', '.devlog', 'devlog.db');
}

function getUploadsDir(): string {
  return path.resolve(process.cwd(), '..', '.devlog', 'uploads');
}

export function getStorageType(): StorageType {
  return (process.env.DEVLOG_STORAGE_TYPE === 'blob' ? 'blob' : 'filesystem') as StorageType;
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  // Create directories
  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(getUploadsDir(), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('change_request', 'bug_report', 'note')),
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical') OR priority IS NULL),
      is_complete INTEGER NOT NULL DEFAULT 0,
      page_url TEXT NOT NULL,
      page_path TEXT NOT NULL,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL REFERENCES entries(entry_id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_type TEXT NOT NULL CHECK(storage_type IN ('filesystem', 'blob')),
      blob_data BLOB,
      file_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS counters (
      type TEXT PRIMARY KEY,
      next_number INTEGER NOT NULL DEFAULT 1
    );

    INSERT OR IGNORE INTO counters (type, next_number) VALUES ('change_request', 1);
    INSERT OR IGNORE INTO counters (type, next_number) VALUES ('bug_report', 1);
    INSERT OR IGNORE INTO counters (type, next_number) VALUES ('note', 1);

    CREATE INDEX IF NOT EXISTS idx_entries_page_path ON entries(page_path);
    CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type);
    CREATE INDEX IF NOT EXISTS idx_entries_is_complete ON entries(is_complete);
    CREATE INDEX IF NOT EXISTS idx_attachments_entry_id ON attachments(entry_id);
  `);

  return db;
}

// --- Entry ID Generation ---

const PREFIXES: Record<EntryType, string> = {
  change_request: 'CR',
  bug_report: 'BUG',
  note: 'NOTE',
};

export function getNextEntryId(type: EntryType): string {
  const database = getDb();
  const stmt = database.prepare(
    'UPDATE counters SET next_number = next_number + 1 WHERE type = ? RETURNING next_number - 1 AS num'
  );
  const row = stmt.get(type) as { num: number };
  return `${PREFIXES[type]}-${String(row.num).padStart(3, '0')}`;
}

// --- Row Mappers ---

interface EntryRow {
  id: number;
  entry_id: string;
  type: string;
  title: string;
  description: string;
  priority: string | null;
  is_complete: number;
  page_url: string;
  page_path: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

interface AttachmentRow {
  id: number;
  entry_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_type: string;
  file_path: string | null;
  created_at: string;
}

function mapEntry(row: EntryRow, attachments: Attachment[] = []): DevLogEntry {
  return {
    id: row.id,
    entryId: row.entry_id,
    type: row.type as EntryType,
    title: row.title,
    description: row.description || '',
    priority: row.priority as DevLogEntry['priority'],
    isComplete: row.is_complete === 1,
    pageUrl: row.page_url,
    pagePath: row.page_path,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments,
  };
}

function mapAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    entryId: row.entry_id,
    filename: row.filename,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageType: row.storage_type as StorageType,
    filePath: row.file_path,
    createdAt: row.created_at,
  };
}

// --- CRUD Operations ---

export function listEntries(options: {
  pagePath?: string;
  type?: EntryType;
  includeComplete?: boolean;
}): { entries: DevLogEntry[]; total: number; openCount: number } {
  const database = getDb();
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (options.pagePath) {
    conditions.push('e.page_path = @pagePath');
    params.pagePath = options.pagePath;
  }
  if (options.type) {
    conditions.push('e.type = @type');
    params.type = options.type;
  }
  if (!options.includeComplete) {
    conditions.push('e.is_complete = 0');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const entries = database
    .prepare(`SELECT * FROM entries e ${where} ORDER BY e.created_at DESC`)
    .all(params) as EntryRow[];

  // Get attachments for all entries
  const entryIds = entries.map((e) => e.entry_id);
  const attachmentMap = new Map<string, Attachment[]>();

  if (entryIds.length > 0) {
    const placeholders = entryIds.map(() => '?').join(',');
    const attachmentRows = database
      .prepare(`SELECT * FROM attachments WHERE entry_id IN (${placeholders}) ORDER BY created_at ASC`)
      .all(...entryIds) as AttachmentRow[];

    for (const row of attachmentRows) {
      const existing = attachmentMap.get(row.entry_id) || [];
      existing.push(mapAttachment(row));
      attachmentMap.set(row.entry_id, existing);
    }
  }

  const mappedEntries = entries.map((e) => mapEntry(e, attachmentMap.get(e.entry_id) || []));

  // Get open count (always unfiltered by completion for accurate badge)
  const countConditions: string[] = ['e.is_complete = 0'];
  const countParams: Record<string, unknown> = {};
  if (options.pagePath) {
    countConditions.push('e.page_path = @pagePath');
    countParams.pagePath = options.pagePath;
  }
  const countWhere = `WHERE ${countConditions.join(' AND ')}`;
  const openCount = (
    database.prepare(`SELECT COUNT(*) as count FROM entries e ${countWhere}`).get(countParams) as { count: number }
  ).count;

  return { entries: mappedEntries, total: mappedEntries.length, openCount };
}

export function getEntry(entryId: string): DevLogEntry | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM entries WHERE entry_id = ?').get(entryId) as EntryRow | undefined;
  if (!row) return null;

  const attachmentRows = database
    .prepare('SELECT * FROM attachments WHERE entry_id = ? ORDER BY created_at ASC')
    .all(entryId) as AttachmentRow[];

  return mapEntry(row, attachmentRows.map(mapAttachment));
}

export function createEntry(dto: CreateEntryDto): DevLogEntry {
  const database = getDb();
  const entryId = getNextEntryId(dto.type);

  database
    .prepare(
      `INSERT INTO entries (entry_id, type, title, description, priority, page_url, page_path, user_agent)
       VALUES (@entryId, @type, @title, @description, @priority, @pageUrl, @pagePath, @userAgent)`
    )
    .run({
      entryId,
      type: dto.type,
      title: dto.title,
      description: dto.description || '',
      priority: dto.priority || null,
      pageUrl: dto.pageUrl,
      pagePath: dto.pagePath,
      userAgent: dto.userAgent || null,
    });

  return getEntry(entryId)!;
}

export function updateEntry(entryId: string, dto: UpdateEntryDto): DevLogEntry | null {
  const database = getDb();
  const existing = getEntry(entryId);
  if (!existing) return null;

  const sets: string[] = ["updated_at = datetime('now')"];
  const params: Record<string, unknown> = { entryId };

  if (dto.title !== undefined) {
    sets.push('title = @title');
    params.title = dto.title;
  }
  if (dto.description !== undefined) {
    sets.push('description = @description');
    params.description = dto.description;
  }
  if (dto.priority !== undefined) {
    sets.push('priority = @priority');
    params.priority = dto.priority;
  }
  if (dto.isComplete !== undefined) {
    sets.push('is_complete = @isComplete');
    params.isComplete = dto.isComplete ? 1 : 0;
  }

  database.prepare(`UPDATE entries SET ${sets.join(', ')} WHERE entry_id = @entryId`).run(params);

  return getEntry(entryId);
}

export function deleteEntry(entryId: string): boolean {
  const database = getDb();

  // Delete filesystem uploads
  const attachments = database
    .prepare("SELECT file_path FROM attachments WHERE entry_id = ? AND storage_type = 'filesystem'")
    .all(entryId) as { file_path: string }[];

  for (const att of attachments) {
    if (att.file_path) {
      try {
        fs.unlinkSync(att.file_path);
      } catch {
        // File may already be deleted
      }
    }
  }

  // Delete entry directory
  const entryDir = path.join(getUploadsDir(), entryId);
  try {
    fs.rmSync(entryDir, { recursive: true, force: true });
  } catch {
    // Directory may not exist
  }

  // CASCADE will handle attachments table
  const result = database.prepare('DELETE FROM entries WHERE entry_id = ?').run(entryId);
  return result.changes > 0;
}

// --- Attachment Operations ---

export function addAttachment(
  entryId: string,
  file: { name: string; type: string; size: number; buffer: Buffer }
): Attachment {
  const database = getDb();
  const storageType = getStorageType();

  // Generate unique filename
  const randomPrefix = Math.random().toString(36).substring(2, 8);
  const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${randomPrefix}-${safeOriginalName}`;

  let filePath: string | null = null;

  if (storageType === 'filesystem') {
    const entryDir = path.join(getUploadsDir(), entryId);
    fs.mkdirSync(entryDir, { recursive: true });
    filePath = path.join(entryDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    database
      .prepare(
        `INSERT INTO attachments (entry_id, filename, original_name, mime_type, size_bytes, storage_type, file_path)
         VALUES (@entryId, @filename, @originalName, @mimeType, @sizeBytes, @storageType, @filePath)`
      )
      .run({
        entryId,
        filename,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageType,
        filePath,
      });
  } else {
    database
      .prepare(
        `INSERT INTO attachments (entry_id, filename, original_name, mime_type, size_bytes, storage_type, blob_data)
         VALUES (@entryId, @filename, @originalName, @mimeType, @sizeBytes, @storageType, @blobData)`
      )
      .run({
        entryId,
        filename,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageType,
        blobData: file.buffer,
      });
  }

  const row = database.prepare('SELECT * FROM attachments WHERE entry_id = ? AND filename = ?').get(entryId, filename) as AttachmentRow;
  return mapAttachment(row);
}

export function getAttachment(id: number): { attachment: Attachment; data: Buffer } | null {
  const database = getDb();
  const row = database.prepare('SELECT *, blob_data FROM attachments WHERE id = ?').get(id) as (AttachmentRow & { blob_data: Buffer | null }) | undefined;
  if (!row) return null;

  const attachment = mapAttachment(row);

  if (row.storage_type === 'blob' && row.blob_data) {
    return { attachment, data: row.blob_data };
  }

  if (row.file_path && fs.existsSync(row.file_path)) {
    return { attachment, data: fs.readFileSync(row.file_path) };
  }

  return null;
}

export function deleteAttachment(id: number): boolean {
  const database = getDb();
  const row = database.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as AttachmentRow | undefined;
  if (!row) return false;

  // Delete file if filesystem storage
  if (row.storage_type === 'filesystem' && row.file_path) {
    try {
      fs.unlinkSync(row.file_path);
    } catch {
      // File may be gone
    }
  }

  const result = database.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  return result.changes > 0;
}

// --- Count ---

export function getOpenCount(pagePath?: string): { openCount: number; totalCount: number } {
  const database = getDb();

  if (pagePath) {
    const open = (
      database.prepare('SELECT COUNT(*) as count FROM entries WHERE is_complete = 0 AND page_path = ?').get(pagePath) as { count: number }
    ).count;
    const total = (
      database.prepare('SELECT COUNT(*) as count FROM entries WHERE page_path = ?').get(pagePath) as { count: number }
    ).count;
    return { openCount: open, totalCount: total };
  }

  const open = (database.prepare('SELECT COUNT(*) as count FROM entries WHERE is_complete = 0').get() as { count: number }).count;
  const total = (database.prepare('SELECT COUNT(*) as count FROM entries').get() as { count: number }).count;
  return { openCount: open, totalCount: total };
}

// --- Export ---

export function exportAllEntries(): DevLogEntry[] {
  const database = getDb();
  const entries = database.prepare('SELECT * FROM entries ORDER BY created_at DESC').all() as EntryRow[];

  const allAttachments = database.prepare('SELECT * FROM attachments ORDER BY created_at ASC').all() as AttachmentRow[];
  const attachmentMap = new Map<string, Attachment[]>();
  for (const row of allAttachments) {
    const existing = attachmentMap.get(row.entry_id) || [];
    existing.push(mapAttachment(row));
    attachmentMap.set(row.entry_id, existing);
  }

  return entries.map((e) => mapEntry(e, attachmentMap.get(e.entry_id) || []));
}
