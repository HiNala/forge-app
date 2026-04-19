"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUTS_HELP } from "@/hooks/use-shortcuts";

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="sr-only">
            Global navigation and command palette shortcuts available in the app.
          </DialogDescription>
        </DialogHeader>
        <ul className="mt-4 space-y-2 text-sm font-body">
          {SHORTCUTS_HELP.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0"
            >
              <span className="text-text-muted">{row.action}</span>
              <kbd className="shrink-0 rounded border border-border bg-bg-elevated px-2 py-0.5 font-mono text-xs text-text">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
