'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, ListTodo, Bug, StickyNote, Check } from 'lucide-react';
import { devlogApi } from '@/lib/devlog/api';
import {
  ENTRY_TYPE_LABELS,
  PRIORITY_LABELS,
  type DevLogEntry,
  type EntryType,
  type Priority,
} from '@/lib/devlog/types';
import { cn } from '@/lib/utils';

interface EntriesViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditEntry: (entry: DevLogEntry) => void;
  refreshKey: number;
  defaultTab?: 'page' | 'all';
}

const TYPE_ICONS: Record<EntryType, React.ReactNode> = {
  change_request: <ListTodo className="h-3.5 w-3.5" />,
  bug_report: <Bug className="h-3.5 w-3.5" />,
  note: <StickyNote className="h-3.5 w-3.5" />,
};

const TYPE_BADGE_STYLES: Record<EntryType, string> = {
  change_request: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  bug_report: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
  note: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-700',
};

const PRIORITY_BADGE_STYLES: Record<Priority, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300',
  low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400',
};

/** Shorten a page path by stripping dynamic segments (UUIDs, numeric IDs) */
function shortenPagePath(pagePath: string): string {
  const uuidPattern = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const numericIdPattern = /\/\d+$/;
  if (uuidPattern.test(pagePath) || numericIdPattern.test(pagePath)) {
    return pagePath.replace(/\/[^/]+$/, '');
  }
  return pagePath;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr + 'Z'); // SQLite dates are UTC
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function EntryTable({
  entries,
  showPageColumn,
  hideCompleted,
  onEdit,
  onToggleComplete,
}: {
  entries: DevLogEntry[];
  showPageColumn: boolean;
  hideCompleted: boolean;
  onEdit: (entry: DevLogEntry) => void;
  onToggleComplete: (entry: DevLogEntry) => void;
}) {
  const filtered = hideCompleted
    ? entries.filter((e) => !e.isComplete)
    : entries;

  if (filtered.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        {hideCompleted ? 'All entries are resolved.' : 'No entries yet.'}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead className="w-24">ID</TableHead>
          <TableHead className="w-20">Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="w-20">Priority</TableHead>
          {showPageColumn && <TableHead className="w-40">Page</TableHead>}
          <TableHead className="w-20">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((entry) => (
          <TableRow
            key={entry.entryId}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onEdit(entry)}
          >
            <TableCell
              className="text-center"
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(entry);
              }}
            >
              <button
                className={cn(
                  'h-5 w-5 rounded border flex items-center justify-center transition-colors',
                  entry.isComplete
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30 hover:border-primary/50'
                )}
              >
                {entry.isComplete && <Check className="h-3 w-3" />}
              </button>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {entry.entryId}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 text-[11px] font-medium',
                  TYPE_BADGE_STYLES[entry.type]
                )}
              >
                {TYPE_ICONS[entry.type]}
                {entry.type === 'change_request'
                  ? 'CR'
                  : entry.type === 'bug_report'
                    ? 'Bug'
                    : 'Note'}
              </Badge>
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  entry.isComplete &&
                    'line-through text-muted-foreground'
                )}
              >
                {entry.title}
              </span>
              {entry.attachments.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({entry.attachments.length} file{entry.attachments.length > 1 ? 's' : ''})
                </span>
              )}
            </TableCell>
            <TableCell>
              {entry.priority && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[11px] font-medium',
                    PRIORITY_BADGE_STYLES[entry.priority]
                  )}
                >
                  {PRIORITY_LABELS[entry.priority]}
                </Badge>
              )}
            </TableCell>
            {showPageColumn && (
              <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[160px]" title={entry.pagePath}>
                {shortenPagePath(entry.pagePath)}
              </TableCell>
            )}
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(entry.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function EntriesViewerDialog({
  open,
  onOpenChange,
  onEditEntry,
  refreshKey,
  defaultTab = 'page',
}: EntriesViewerDialogProps) {
  const pathname = usePathname();
  const [pageEntries, setPageEntries] = useState<DevLogEntry[]>([]);
  const [allEntries, setAllEntries] = useState<DevLogEntry[]>([]);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [exporting, setExporting] = useState(false);

  // Sync default tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const loadEntries = useCallback(async () => {
    if (!open) return;
    try {
      const [pageResult, allResult] = await Promise.all([
        devlogApi.listEntries({ pagePath: pathname }),
        devlogApi.listEntries({}),
      ]);
      setPageEntries(pageResult.entries);
      setAllEntries(allResult.entries);
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
  }, [open, pathname]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshKey]);

  const handleToggleComplete = async (entry: DevLogEntry) => {
    try {
      await devlogApi.updateEntry(entry.entryId, { isComplete: !entry.isComplete });
      loadEntries();
    } catch (err) {
      console.error('Failed to toggle complete:', err);
    }
  };

  const handleExport = async (format: 'json' | 'markdown') => {
    setExporting(true);
    try {
      await devlogApi.exportEntries(format);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>DevLog Entries</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'page' | 'all')}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="page">
                This Page ({pageEntries.filter((e) => !hideCompleted || !e.isComplete).length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Pages ({allEntries.filter((e) => !hideCompleted || !e.isComplete).length})
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hide-completed"
                  checked={hideCompleted}
                  onCheckedChange={(checked) =>
                    setHideCompleted(checked === true)
                  }
                />
                <label
                  htmlFor="hide-completed"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Hide resolved
                </label>
              </div>

              {activeTab === 'all' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting}>
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('markdown')}>
                      Export as Markdown
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-2">
            <TabsContent value="page" className="mt-0">
              <EntryTable
                entries={pageEntries}
                showPageColumn={false}
                hideCompleted={hideCompleted}
                onEdit={onEditEntry}
                onToggleComplete={handleToggleComplete}
              />
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              <EntryTable
                entries={allEntries}
                showPageColumn={true}
                hideCompleted={hideCompleted}
                onEdit={onEditEntry}
                onToggleComplete={handleToggleComplete}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
