"use client";

import Link from "next/link";
import { SHORTCUTS_HELP } from "@/lib/shortcuts-help";

export default function ShortcutsHelpPage() {
  return (
    <div className="mx-auto max-w-lg pb-16 pt-6 font-body">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Help</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-text">Keyboard shortcuts</h1>
      <p className="mt-2 text-sm text-text-muted">
        Press <kbd className="rounded border border-border px-1 font-mono text-xs">?</kbd> anywhere
        in the app (outside a text field) for this list.
      </p>
      <ul className="mt-8 space-y-2 text-sm">
        {SHORTCUTS_HELP.map((row) => (
          <li
            key={`${row.keys}-${row.action}`}
            className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0"
          >
            <span className="text-text-muted">{row.action}</span>
            <kbd className="shrink-0 rounded border border-border bg-bg-elevated px-2 py-0.5 font-mono text-xs text-text">
              {row.keys}
            </kbd>
          </li>
        ))}
      </ul>
      <p className="mt-8">
        <Link href="/dashboard" className="text-sm font-medium text-accent hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}
