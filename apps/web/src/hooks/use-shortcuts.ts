"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui";

export { SHORTCUTS_HELP } from "@/lib/shortcuts-help";

function isTypingTarget(el: HTMLElement | null) {
  return el?.closest(
    "input:not([readonly]), textarea, select, [contenteditable=true], [role=combobox]",
  );
}

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
      const target = e.target as HTMLElement | null;

      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        if (isTypingTarget(target)) return;
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        const k = e.key.toLowerCase();
        if (k === "c" || k === "p" || k === "d") {
          if (isTypingTarget(target)) return;
          const map = {
            c: "/studio?workflow=contact_form",
            p: "/studio?workflow=proposal",
            d: "/studio?workflow=pitch_deck",
          } as const;
          const href = map[k as keyof typeof map];
          e.preventDefault();
          router.push(href);
          return;
        }
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isTypingTarget(target)) return;
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        return;
      }
      if (e.altKey) return;
      if (isTypingTarget(target)) {
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
        t: "/templates",
        p: "/settings/profile",
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
