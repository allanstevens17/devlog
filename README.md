# DevLog

**A floating in-browser development log for Next.js projects.**

Track change requests, bug reports, and notes as you work — without leaving the page. Built for developers who use Claude Code and want a fast, local-first way to capture issues and context during development sessions.

Created by **Allan Stevens** and **Claude Code** (Anthropic).

---

## What It Does

DevLog adds a small floating **B** button to the bottom-right corner of every page in your Next.js app. Click it to:

- **Log a Change Request** — with title, description, priority (Low/Med/High/Critical), and file attachments
- **Log a Bug Report** — same fields, tagged as a bug
- **Add a Note** — quick freeform notes timestamped to the current page
- **View Entries** — browse entries for the current page or the entire project, with export to JSON or Markdown
- **Copy for Claude** — one-click copy of any entry formatted as markdown with local file paths, ready to paste into a Claude Code session

All data is stored locally in a SQLite database (`.devlog/devlog.db`). Nothing is sent anywhere. The widget only appears when `NEXT_PUBLIC_SHOW_DEV_TOOLS=true` is set, so it never shows in production.

---

## Features

- **Page-scoped entries** — each entry is tagged with the full page URL where it was created
- **Smart page matching** — entries logged on `/ops/quotes/abc-123` appear on any `/ops/quotes/*` page (UUID and numeric ID segments are matched as a group)
- **Badge count** — the B button shows a red badge with the number of open entries for the current page/section
- **Quick resolve** — checkmark toggle in the entries list to mark items complete/incomplete without opening them
- **Mark as Resolved** — toggle entries as resolved (strikethrough in the viewer)
- **File attachments** — upload screenshots and text files, stored on the filesystem or as SQLite blobs
- **Project-level view** — "All Pages" tab shows every entry across the project with shortened page paths (full path on hover)
- **Smart View Entries** — shows entry count for current page, or opens to "All Pages" when no entries exist on the current page
- **Export** — download all entries as JSON or Markdown, grouped by page
- **Claude Code integration** — slash commands (`/devlog` to read entries, `/install-devlog` for setup) and a "Copy for Claude" button that formats entries with local file paths
- **Zero external dependencies** — only requires `better-sqlite3` (no Redis, no Postgres, no cloud services)
- **Self-contained** — all files live in your project, no npm package to manage

---

## Requirements

- **Next.js 14+** with App Router
- **Tailwind CSS**
- **shadcn/ui** components: Dialog, Button, Input, Textarea, Select, Switch, Tabs, Table, Badge, Popover, AlertDialog, Checkbox, DropdownMenu, Label, Separator

If any shadcn components are missing:
```bash
npx shadcn@latest add dialog button input textarea select switch tabs table badge popover alert-dialog checkbox dropdown-menu label separator
```

---

## Installation

### Option A: Let Claude Code install it

If you have Claude Code, just say:

> Install DevLog into this project

Or use the slash command:

> /install-devlog

Claude will copy all files, install dependencies, update your config, and mount the widget.

### Option B: Manual installation

#### 1. Install SQLite dependency

```bash
npm install better-sqlite3 && npm install -D @types/better-sqlite3
```

#### 2. Copy source files

Extract the archive and copy the `src/` directory contents into your project's `src/` directory:

```
src/
  lib/devlog/          -> your-project/src/lib/devlog/
  app/api/devlog/      -> your-project/src/app/api/devlog/
  components/devlog/   -> your-project/src/components/devlog/
```

Optionally copy `.claude/commands/` for Claude Code integration:

```
.claude/commands/      -> your-project/.claude/commands/
```

#### 3. Update next.config.ts

Add `better-sqlite3` to the server external packages:

```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // ... your other config
};
```

#### 4. Mount the widget

Add `<DevLogWidget />` to your root layout (`src/app/layout.tsx`), after your providers:

```tsx
import { DevLogWidget } from '@/components/devlog';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
        <DevLogWidget />
      </body>
    </html>
  );
}
```

#### 5. Set environment variable

In `.env.local`:

```
NEXT_PUBLIC_SHOW_DEV_TOOLS=true
```

#### 6. Add to .gitignore

```
# DevLog local data
.devlog/
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SHOW_DEV_TOOLS` | `false` | Show/hide the DevLog widget |
| `DEVLOG_STORAGE_TYPE` | `filesystem` | `filesystem` stores uploads on disk at `.devlog/uploads/`. `blob` stores them in SQLite. |

---

## Using with Claude Code

### Reading entries

Use the `/devlog` slash command, or ask Claude:

> Read my DevLog entries

Claude will query the SQLite database directly and present all entries.

### Copying entries into a session

Click the **Copy for Claude** button on any saved entry. It formats the entry as markdown with local file paths for attachments, ready to paste into Claude Code.

### Direct database queries

```bash
# List open entries
sqlite3 .devlog/devlog.db "SELECT entry_id, type, title, priority FROM entries WHERE is_complete = 0 ORDER BY created_at DESC"

# Export everything
sqlite3 -header -column .devlog/devlog.db "SELECT * FROM entries"

# List attachments
sqlite3 .devlog/devlog.db "SELECT entry_id, original_name, file_path FROM attachments"
```

---

## File Structure

```
src/
  lib/devlog/
    types.ts              # TypeScript types and constants
    db.ts                 # SQLite database layer (schema, CRUD)
    api.ts                # Client-side fetch wrapper
  app/api/devlog/
    entries/
      route.ts            # GET list + POST create
      [entryId]/
        route.ts          # GET + PATCH + DELETE entry
        attachments/
          route.ts        # POST file upload
    attachments/
      [id]/
        route.ts          # GET serve + DELETE attachment
    count/
      route.ts            # GET badge count
    export/
      route.ts            # GET export JSON/Markdown
  components/devlog/
    index.ts              # Barrel export
    devlog-widget.tsx     # Root orchestrator
    devlog-fab.tsx        # Floating B button with popover menu
    entry-form-dialog.tsx # Create/edit entry form
    entries-viewer-dialog.tsx  # Entries table viewer
.claude/commands/
    devlog.md             # /devlog slash command
    install-devlog.md     # /install-devlog slash command
```

---

## License

MIT

---

Built with Claude Code by Allan Stevens.
