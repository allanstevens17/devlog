'use client';

import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ListTodo, Bug, StickyNote, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EntryType } from '@/lib/devlog/types';

const COOKIE_NAME = 'devlog_user';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string): void {
  // Max-Age of ~10 years (effectively no expiration)
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=315360000; SameSite=Lax`;
}

interface DevLogFABProps {
  count: number;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onNewEntry: (type: EntryType) => void;
  onViewEntries: () => void;
  entryCount: number;
  pageEntryCount: number;
  onUserNameResolved: (name: string) => void;
}

export function DevLogFAB({
  count,
  menuOpen,
  onMenuOpenChange,
  onNewEntry,
  onViewEntries,
  entryCount,
  pageEntryCount,
  onUserNameResolved,
}: DevLogFABProps) {
  const [userName, setUserName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingName, setGreetingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load cookie on mount
  useEffect(() => {
    const stored = getCookie(COOKIE_NAME);
    if (stored) {
      setUserName(stored);
      onUserNameResolved(stored);
    }
  }, [onUserNameResolved]);

  // Auto-focus name input when popover opens and no name set
  useEffect(() => {
    if (menuOpen && !userName) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [menuOpen, userName]);

  const handleNameSubmit = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setCookie(COOKIE_NAME, trimmed);
    setUserName(trimmed);
    onUserNameResolved(trimmed);
    setGreetingName(trimmed);
    setShowGreeting(true);
    // Show greeting briefly, then reveal menu
    setTimeout(() => setShowGreeting(false), 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSubmit();
    }
  };

  // Determine what to render inside the popover
  const needsName = !userName && !showGreeting;
  const showConfirmation = showGreeting;

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
          {needsName ? (
            <div className="flex flex-col gap-2 py-1 px-1">
              <div className="text-sm font-medium">Howdy 👋</div>
              <div className="text-xs text-muted-foreground">Who do we have here?</div>
              <Input
                ref={inputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your name"
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8 text-sm"
                onClick={handleNameSubmit}
                disabled={!nameInput.trim()}
              >
                Continue
              </Button>
            </div>
          ) : showConfirmation ? (
            <div className="flex items-center justify-center py-4 px-1">
              <div className="text-sm font-medium">
                Thanks {greetingName}! 🎉
              </div>
            </div>
          ) : (
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
                Change Request
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
                Bug Report
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
                Note
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
                  View Entries{pageEntryCount > 0 ? ` (${pageEntryCount})` : ''}
                </Button>
              ) : (
                <div className="flex items-center gap-2 h-9 px-3 text-sm text-muted-foreground">
                  <List className="h-4 w-4" />
                  No Entries
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
