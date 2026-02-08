'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ListTodo, Bug, StickyNote, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EntryType } from '@/lib/devlog/types';

interface DevLogFABProps {
  count: number;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onNewEntry: (type: EntryType) => void;
  onViewEntries: () => void;
  entryCount: number;
}

export function DevLogFAB({
  count,
  menuOpen,
  onMenuOpenChange,
  onNewEntry,
  onViewEntries,
  entryCount,
}: DevLogFABProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <Popover open={menuOpen} onOpenChange={onMenuOpenChange}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center justify-center',
              'h-10 w-10 rounded-full',
              'bg-foreground text-background',
              'shadow-lg hover:scale-105 transition-transform',
              'text-sm font-semibold',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'relative'
            )}
            title="DevLog"
          >
            B
            {count > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1',
                  'flex items-center justify-center',
                  'h-5 min-w-5 px-1 rounded-full',
                  'bg-red-500 text-white',
                  'text-[10px] font-bold leading-none'
                )}
              >
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={8}
          className="w-56 p-2"
        >
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start gap-2 h-9 px-3 text-sm"
              onClick={() => {
                onMenuOpenChange(false);
                onNewEntry('change_request');
              }}
            >
              <ListTodo className="h-4 w-4" />
              + Change Request
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2 h-9 px-3 text-sm"
              onClick={() => {
                onMenuOpenChange(false);
                onNewEntry('bug_report');
              }}
            >
              <Bug className="h-4 w-4" />
              + Bug Report
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2 h-9 px-3 text-sm"
              onClick={() => {
                onMenuOpenChange(false);
                onNewEntry('note');
              }}
            >
              <StickyNote className="h-4 w-4" />
              + Note
            </Button>

            <Separator className="my-1" />

            {entryCount > 0 ? (
              <Button
                variant="ghost"
                className="justify-start gap-2 h-9 px-3 text-sm"
                onClick={() => {
                  onMenuOpenChange(false);
                  onViewEntries();
                }}
              >
                <List className="h-4 w-4" />
                View Entries ({entryCount})
              </Button>
            ) : (
              <div className="flex items-center gap-2 h-9 px-3 text-sm text-muted-foreground">
                <List className="h-4 w-4" />
                No Entries
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
