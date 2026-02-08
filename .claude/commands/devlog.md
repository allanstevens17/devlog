# Read DevLog Entries

Read all open DevLog entries from the local database and present them for review.

## Instructions

1. Check if `.devlog/devlog.db` exists in the project root
2. If it exists, read entries using the Read tool on the SQLite database by running:
   ```bash
   sqlite3 -header -separator '|' .devlog/devlog.db "
     SELECT e.entry_id, e.type, e.title, e.priority,
            CASE WHEN e.is_complete = 1 THEN 'Complete' ELSE 'Open' END as status,
            e.page_path, e.description, e.created_at, e.updated_at,
            GROUP_CONCAT(a.original_name || ' (' || a.file_path || ')', ', ') as attachments
     FROM entries e
     LEFT JOIN attachments a ON a.entry_id = e.entry_id
     GROUP BY e.entry_id
     ORDER BY e.is_complete ASC, e.created_at DESC
   "
   ```
3. Present entries in a readable format grouped by status (Open first, then Complete)
4. For any entries with text file attachments (.md, .tsx, .jsx, .ts, .js, .txt, .json, etc.), offer to read them from `.devlog/uploads/`
5. For image attachments, note the file path so they can be viewed: `.devlog/uploads/{entry_id}/{filename}`
6. If a specific entry ID is mentioned (e.g., "review CR-001"), focus on that entry and read all its attachments
7. If no database exists, inform the user that DevLog has no data yet — they need to create entries via the B button in the browser

## Quick Commands

```bash
# Count open entries
sqlite3 .devlog/devlog.db "SELECT COUNT(*) FROM entries WHERE is_complete = 0"

# List just entry IDs and titles
sqlite3 .devlog/devlog.db "SELECT entry_id, title FROM entries WHERE is_complete = 0 ORDER BY created_at DESC"

# Get a specific entry
sqlite3 .devlog/devlog.db "SELECT * FROM entries WHERE entry_id = 'CR-001'"

# List attachments for an entry
sqlite3 .devlog/devlog.db "SELECT original_name, file_path FROM attachments WHERE entry_id = 'CR-001'"
```
