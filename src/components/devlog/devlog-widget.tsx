'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { DevLogFAB } from './devlog-fab';
import { EntryFormDialog } from './entry-form-dialog';
import { EntriesViewerDialog } from './entries-viewer-dialog';
import { devlogApi } from '@/lib/devlog/api';
import type { EntryType, DevLogEntry } from '@/lib/devlog/types';

export function DevLogWidget() {
  // Only render when dev tools are enabled
  if (process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS !== 'true') {
    return null;
  }

  return <DevLogWidgetInner />;
}

function DevLogWidgetInner() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<EntryType>('note');
  const [editingEntry, setEditingEntry] = useState<DevLogEntry | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const result = await devlogApi.getCount(pathname);
      setOpenCount(result.openCount);
      setTotalCount(result.totalCount);
    } catch {
      // Silently fail — DevLog DB may not be initialized yet
    }
  }, [pathname]);

  // Refresh count on pathname change
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const handleNewEntry = (type: EntryType) => {
    setFormType(type);
    setEditingEntry(null);
    setFormOpen(true);
    setMenuOpen(false);
  };

  const handleViewEntries = () => {
    setViewerOpen(true);
    setMenuOpen(false);
  };

  const handleSaved = () => {
    refreshCount();
    setRefreshKey((k) => k + 1);
  };

  const handleEditEntry = (entry: DevLogEntry) => {
    setEditingEntry(entry);
    setFormType(entry.type);
    setViewerOpen(false);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      // Refresh viewer data when form closes
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <>
      <DevLogFAB
        count={openCount}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onNewEntry={handleNewEntry}
        onViewEntries={handleViewEntries}
        entryCount={totalCount}
      />

      <EntryFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        type={formType}
        entry={editingEntry}
        onSaved={handleSaved}
      />

      <EntriesViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onEditEntry={handleEditEntry}
        refreshKey={refreshKey}
      />
    </>
  );
}
