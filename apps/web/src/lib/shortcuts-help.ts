/**
 * Canonical keyboard shortcuts for help UI (dialog + /help/shortcuts).
 * Keep in sync with `useAppShortcuts` behavior in `@/hooks/use-shortcuts`.
 */
export const SHORTCUTS_HELP = [
  { keys: "⌘K / Ctrl+K", action: "Command palette (search pages, people, settings)" },
  { keys: "⌘/ / Ctrl+/", action: "Toggle sidebar" },
  { keys: "⌘⇧C / Ctrl+Shift+C", action: "New contact form (Studio)" },
  { keys: "⌘⇧P / Ctrl+Shift+P", action: "New proposal (Studio)" },
  { keys: "⌘⇧D / Ctrl+Shift+D", action: "New pitch deck (Studio)" },
  { keys: "G then D", action: "Go to Dashboard" },
  { keys: "G then S", action: "Go to Studio" },
  { keys: "G then A", action: "Go to Analytics" },
  { keys: "G then T", action: "Go to Templates" },
  { keys: "G then P", action: "Go to Settings → Profile" },
  { keys: "/", action: "Dashboard — focus search" },
  { keys: "N", action: "Dashboard — open Studio (new workflow)" },
  { keys: "J / K", action: "Dashboard — move selection down / up among page cards (vim-style)" },
  { keys: "↑ / ↓", action: "Dashboard — move focus between page cards (also J/K)" },
  { keys: "⌘Return / Ctrl+Enter", action: "Studio — send prompt (empty state or chat); Shift+Enter newline" },
  { keys: "⌘S / Ctrl+S", action: "Studio — confirm draft save (auto-save still runs in the background)" },
  { keys: "Enter", action: "Dashboard — open focused page; Submissions — expand row; Studio — submit prompt (Shift+Enter newline)" },
  { keys: "E", action: "Dashboard — open focused page in Studio" },

  { keys: "Escape", action: "Submissions — collapse expanded row; close overlays where implemented" },
  { keys: "R", action: "Submissions — open reply (when a row is expanded)" },
  { keys: "A", action: "Submissions — archive submission (when expanded)" },
  { keys: "?", action: "Open this shortcuts list" },
] as const;
