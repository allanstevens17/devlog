# Install DevLog

Install the DevLog development utility into the current Next.js project. DevLog is a floating in-browser widget (B button, bottom-right corner) for tracking change requests, bug reports, and notes during development.

## Prerequisites
- Next.js 14+ with App Router
- Tailwind CSS
- shadcn/ui components installed (Dialog, Button, Input, Textarea, Select, Switch, Tabs, Table, Badge, Popover, AlertDialog, Separator, Checkbox, DropdownMenu, Label)
- If any shadcn components are missing, install them: `npx shadcn@latest add [component]`

## Installation Steps

### 1. Install SQLite dependency
```bash
npm install better-sqlite3 && npm install -D @types/better-sqlite3
```

### 2. Update next.config.ts
Add `serverExternalPackages: ['better-sqlite3']` to the NextConfig object.

### 3. Add to .gitignore
```
# DevLog local data
.devlog/
```

### 4. Copy source files
Copy all files from the DevLog archive `src/` directory into your project's `src/` directory:

**Core library** (`src/lib/devlog/`):
- `types.ts` — TypeScript type definitions
- `db.ts` — SQLite database layer (schema, CRUD, attachments)
- `api.ts` — Client-side fetch wrapper

**API routes** (`src/app/api/devlog/`):
- `entries/route.ts` — GET (list) + POST (create) entries
- `entries/[entryId]/route.ts` — GET + PATCH + DELETE single entry
- `entries/[entryId]/attachments/route.ts` — POST file upload
- `attachments/[id]/route.ts` — GET (serve) + DELETE attachment
- `count/route.ts` — GET badge count
- `export/route.ts` — GET export as JSON/Markdown

**React components** (`src/components/devlog/`):
- `index.ts` — Barrel export
- `devlog-widget.tsx` — Root orchestrator
- `devlog-fab.tsx` — Floating B button with popover menu
- `entry-form-dialog.tsx` — Create/edit entry form
- `entries-viewer-dialog.tsx` — Entries table viewer

### 5. Mount the widget
Add `<DevLogWidget />` to the root layout, after your providers:

```tsx
import { DevLogWidget } from '@/components/devlog';

// In your layout body:
<Providers>{children}</Providers>
<DevLogWidget />
```

### 6. Set environment variable
In `.env.local`:
```
NEXT_PUBLIC_SHOW_DEV_TOOLS=true
```

Optional — to store file uploads as SQLite blobs instead of filesystem:
```
DEVLOG_STORAGE_TYPE=blob
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `NEXT_PUBLIC_SHOW_DEV_TOOLS` | `false` | Show/hide the DevLog widget |
| `DEVLOG_STORAGE_TYPE` | `filesystem` | `filesystem` or `blob` for file uploads |

## Reading Data with Claude Code

Use the `/devlog` command to read all entries, or manually query:

```bash
sqlite3 .devlog/devlog.db "SELECT entry_id, type, title, priority FROM entries WHERE is_complete = 0 ORDER BY created_at DESC"
```

Text file attachments are readable at `.devlog/uploads/{entry_id}/`.
