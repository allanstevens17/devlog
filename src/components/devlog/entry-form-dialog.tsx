'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Image, FileText, X, Upload, Copy, Check } from 'lucide-react';
import { devlogApi } from '@/lib/devlog/api';
import {
  ENTRY_TYPE_LABELS,
  PRIORITY_LABELS,
  type EntryType,
  type Priority,
  type DevLogEntry,
  type Attachment,
} from '@/lib/devlog/types';
import { cn } from '@/lib/utils';

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: EntryType;
  entry?: DevLogEntry | null;
  onSaved: () => void;
}

function getDefaultNoteTitle(): string {
  const now = new Date();
  return `Note on ${now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} at ${now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;
}

function formatCopyForClaude(entry: DevLogEntry): string {
  const status = entry.isComplete ? 'Resolved' : 'Open';
  const priority = entry.priority
    ? ` | **Priority**: ${PRIORITY_LABELS[entry.priority]}`
    : '';

  const lines: string[] = [
    `## [${entry.entryId}] ${entry.title}`,
    `**Type**: ${ENTRY_TYPE_LABELS[entry.type]}${priority} | **Status**: ${status}`,
    `**Page**: ${entry.pagePath}`,
    `**Created**: ${entry.createdAt}`,
    '',
  ];

  if (entry.description) {
    lines.push('### Description', entry.description, '');
  }

  if (entry.attachments.length > 0) {
    lines.push('### Attachments');
    for (const att of entry.attachments) {
      const relativePath = `.devlog/uploads/${entry.entryId}/${att.filename}`;
      if (att.mimeType.startsWith('image/')) {
        lines.push(`- Screenshot: \`${relativePath}\``);
      } else {
        lines.push(
          `- ${att.originalName}: \`${relativePath}\` (read with \`cat ${relativePath}\`)`
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function EntryFormDialog({
  open,
  onOpenChange,
  type,
  entry,
  onSaved,
}: EntryFormDialogProps) {
  const isEditing = !!entry;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [isComplete, setIsComplete] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Snapshot of initial values for dirty-checking (editing mode)
  const initialSnapshot = useRef({ title: '', description: '', priority: '' as Priority | '', isComplete: false });

  // Initialize form when entry changes or dialog opens
  useEffect(() => {
    if (open) {
      if (entry) {
        setTitle(entry.title);
        setDescription(entry.description);
        setPriority(entry.priority || '');
        setIsComplete(entry.isComplete);
        setAttachments(entry.attachments);
        setSavedEntryId(entry.entryId);
        initialSnapshot.current = {
          title: entry.title,
          description: entry.description,
          priority: entry.priority || '',
          isComplete: entry.isComplete,
        };
      } else {
        const defaultTitle = type === 'note' ? getDefaultNoteTitle() : '';
        setTitle(defaultTitle);
        setDescription('');
        setPriority('');
        setIsComplete(false);
        setAttachments([]);
        setSavedEntryId(null);
        initialSnapshot.current = { title: defaultTitle, description: '', priority: '', isComplete: false };
      }
      setPendingFiles([]);
      setCopied(false);
    }
  }, [open, entry, type]);

  // Detect if form has unsaved changes (for editing mode X-close behavior)
  const isDirty = useMemo(() => {
    if (!isEditing) return true; // New entries always prompt
    const snap = initialSnapshot.current;
    return (
      title !== snap.title ||
      description !== snap.description ||
      priority !== snap.priority ||
      isComplete !== snap.isComplete ||
      pendingFiles.length > 0
    );
  }, [isEditing, title, description, priority, isComplete, pendingFiles]);

  const uploadPendingFiles = useCallback(
    async (entryId: string) => {
      const uploaded: Attachment[] = [];
      for (const file of pendingFiles) {
        try {
          const att = await devlogApi.uploadAttachment(entryId, file);
          uploaded.push(att);
        } catch (err) {
          console.error('Failed to upload file:', err);
        }
      }
      setPendingFiles([]);
      setAttachments((prev) => [...prev, ...uploaded]);
    },
    [pendingFiles]
  );

  const handleSave = useCallback(
    async () => {
      if (!title.trim()) return;
      setSaving(true);

      try {
        let currentEntryId = savedEntryId;

        if (isEditing && currentEntryId) {
          await devlogApi.updateEntry(currentEntryId, {
            title: title.trim(),
            description,
            priority: type !== 'note' && priority ? (priority as Priority) : null,
            isComplete,
          });
        } else if (currentEntryId) {
          await devlogApi.updateEntry(currentEntryId, {
            title: title.trim(),
            description,
            priority: type !== 'note' && priority ? (priority as Priority) : null,
            isComplete,
          });
        } else {
          const newEntry = await devlogApi.createEntry({
            type,
            title: title.trim(),
            description,
            priority: type !== 'note' && priority ? (priority as Priority) : undefined,
            pageUrl: window.location.href,
            pagePath: window.location.pathname,
            userAgent: navigator.userAgent,
          });
          currentEntryId = newEntry.entryId;
          setSavedEntryId(currentEntryId);
        }

        if (pendingFiles.length > 0 && currentEntryId) {
          await uploadPendingFiles(currentEntryId);
        }

        onSaved();
        onOpenChange(false);
      } catch (err) {
        console.error('Failed to save entry:', err);
      } finally {
        setSaving(false);
      }
    },
    [
      title,
      description,
      priority,
      isComplete,
      type,
      savedEntryId,
      isEditing,
      pendingFiles,
      uploadPendingFiles,
      onSaved,
      onOpenChange,
    ]
  );

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeAttachment = async (attId: number) => {
    try {
      await devlogApi.deleteAttachment(attId);
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
    } catch (err) {
      console.error('Failed to delete attachment:', err);
    }
  };

  const handleCopyForClaude = async () => {
    if (!savedEntryId) return;
    try {
      const freshEntry = await devlogApi.getEntry(savedEntryId);
      const text = formatCopyForClaude(freshEntry);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // For new entries: discard (don't save, just close)
  // For existing entries: delete the entry permanently
  const handleConfirmAction = async () => {
    if (isEditing && savedEntryId) {
      // Delete existing entry
      try {
        await devlogApi.deleteEntry(savedEntryId);
        onSaved();
      } catch (err) {
        console.error('Failed to delete entry:', err);
      }
    }
    // For new entries, just close without saving
    setConfirmOpen(false);
    onOpenChange(false);
  };

  // Handle the X button / onOpenChange from Dialog
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // User is trying to close the dialog
      if (isEditing) {
        // Editing existing: only prompt if dirty
        if (isDirty) {
          setConfirmOpen(true);
          return;
        }
        // No changes — close silently
        onOpenChange(false);
      } else {
        // New entry — always show discard warning
        setConfirmOpen(true);
      }
      return;
    }
    onOpenChange(nextOpen);
  };

  const typeLabel = ENTRY_TYPE_LABELS[type];

  // Determine confirm dialog text based on new vs editing
  const confirmTitle = isEditing
    ? 'Delete this entry?'
    : 'Discard this entry?';
  const confirmDescription = isEditing
    ? 'This will permanently delete this entry and any uploaded files. This action cannot be undone.'
    : 'This entry has not been saved. Any content you entered will be lost.';
  const confirmActionLabel = isEditing ? 'Delete' : 'Discard';

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? `Edit ${typeLabel}` : `New ${typeLabel}`}
              {savedEntryId && (
                <Badge variant="outline" className="ml-2 font-mono text-xs">
                  {savedEntryId}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="devlog-title">Title</Label>
              <Input
                id="devlog-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${typeLabel} title...`}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="devlog-desc">Description</Label>
              <Textarea
                id="devlog-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe in detail..."
                className="min-h-[160px] resize-y"
              />
            </div>

            {/* Priority (not for notes) */}
            {type !== 'note' && (
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select priority..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mark as Resolved (not for notes) */}
            {type !== 'note' && (
              <div className="flex items-center gap-3">
                <Switch
                  id="devlog-complete"
                  checked={isComplete}
                  onCheckedChange={setIsComplete}
                />
                <Label htmlFor="devlog-complete">
                  Mark as Resolved
                </Label>
              </div>
            )}

            {/* File Uploads */}
            <div className="space-y-3">
              <Label>Attachments</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Image className="h-4 w-4" />
                  Upload Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="h-4 w-4" />
                  Upload Text File
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.jsx,.tsx,.ts,.js,.doc,.docx,.json,.css,.html,.yaml,.yml"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Existing attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      {att.mimeType.startsWith('image/') ? (
                        <Image className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <a
                        href={devlogApi.getAttachmentUrl(att.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-foreground"
                      >
                        {att.originalName}
                      </a>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending files (not yet uploaded) */}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm"
                    >
                      <Upload className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-foreground">{file.name}</span>
                      <button
                        onClick={() => removePendingFile(i)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmOpen(true)}
              >
                {isEditing ? 'Delete' : 'Discard'}
              </Button>
              {savedEntryId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleCopyForClaude}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copied!' : 'Copy for Claude'}
                </Button>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
            >
              {saving ? 'Saving...' : 'Save and Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard / Delete confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
