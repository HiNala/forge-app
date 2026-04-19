"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export const SHORTCUTS_HELP = [
  { keys: "⌘ K / Ctrl+K", action: "Command palette" },
  { keys: "G then D", action: "Go to Dashboard" },
  { keys: "G then S", action: "Go to Studio" },
  { keys: "G then A", action: "Go to Analytics" },
  { keys: "?", action: "This shortcuts list" },
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
