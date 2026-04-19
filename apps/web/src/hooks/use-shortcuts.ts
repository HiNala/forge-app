"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export const SHORTCUTS_HELP = [
  { keys: "⌘ K / Ctrl+K", action: "Command palette (search pages, people, settings)" },
  { keys: "⌘⇧C / Ctrl+Shift+C", action: "New contact form (Studio)" },
  { keys: "⌘⇧P / Ctrl+Shift+P", action: "New proposal (Studio)" },
  { keys: "⌘⇧D / Ctrl+Shift+D", action: "New pitch deck (Studio)" },
  { keys: "G then D", action: "Go to Dashboard" },
  { keys: "G then S", action: "Go to Studio" },
  { keys: "G then A", action: "Go to Analytics" },
  { keys: "↑ / ↓", action: "Dashboard — move focus between page cards; Submissions — move between rows" },
  { keys: "Enter", action: "Dashboard — open focused page; Submissions — expand or collapse row" },
  { keys: "E", action: "Dashboard — open focused page in Studio" },
  { keys: "Escape", action: "Submissions — collapse expanded row" },
  { keys: "R", action: "Submissions — open reply (when a row is expanded)" },
  { keys: "A", action: "Submissions — archive submission (when expanded)" },
  { keys: "?", action: "Open this shortcuts list" },
] as const;

/**
 * Gmail-style chord navigation + `?` help. Cmd+K is handled in `CommandPaletteProvider`.
 */
export function useAppShortcuts(
  setHelpOpen: React.Dispatch<React.SetStateAction<boolean>>,
) {
  const router = useRouter();
  const armedRef = React.useRef(false);

  React.useEffect(() => {
    let clearTimer: ReturnType<typeof setTimeout>;
    const disarm = () => {
      armedRef.current = false;
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === "c" || k === "p" || k === "d") {
          const map = {
            c: "/studio?workflow=contact_form",
            p: "/studio?workflow=proposal",
            d: "/studio?workflow=pitch_deck",
          } as const;
          const href = map[k as keyof typeof map];
          if (href) {
            e.preventDefault();
            router.push(href);
          }
          return;
        }
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target as HTMLElement | null;
        if (
          el?.closest(
            "input:not([readonly]), textarea, select, [contenteditable=true], [role=combobox]",
          )
        ) {
          return;
        }
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el?.closest(
          "input:not([readonly]), textarea, select, [contenteditable=true], [role=combobox]",
        )
      ) {
        return;
      }

      if (e.key === "g" || e.key === "G") {
        armedRef.current = true;
        clearTimeout(clearTimer);
        clearTimer = setTimeout(disarm, 1200);
        return;
      }
      if (!armedRef.current) return;
      armedRef.current = false;
      clearTimeout(clearTimer);
      const map: Record<string, string> = {
        d: "/dashboard",
        s: "/studio",
        a: "/analytics",
      };
      const href = map[e.key.toLowerCase()];
      if (href) {
        e.preventDefault();
        router.push(href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(clearTimer);
    };
  }, [router, setHelpOpen]);
}
