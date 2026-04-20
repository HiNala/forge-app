"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PALETTES = {
  teal: { label: "Teal", value: "oklch(50% 0.15 192)" },
  sage: { label: "Sage", value: "oklch(48% 0.1 155)" },
  indigo: { label: "Indigo", value: "oklch(48% 0.14 270)" },
} as const;

type PaletteKey = keyof typeof PALETTES;

const STORAGE_KEY = "forge-dev-accent-palette";

/**
 * Dev-only runtime accent preview (Cmd/Ctrl+Shift+P).
 * Not shown in production builds.
 */
export function PaletteSwitcher() {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<PaletteKey>("teal");

  const applyVars = React.useCallback((key: PaletteKey) => {
    const v = PALETTES[key].value;
    const root = document.documentElement;
    root.style.setProperty("--accent", v);
    root.style.setProperty(
      "--accent-light",
      `color-mix(in oklch, ${v} 10%, transparent)`,
    );
    root.style.setProperty(
      "--accent-mid",
      `color-mix(in oklch, ${v} 20%, transparent)`,
    );
    root.style.setProperty(
      "--accent-bold",
      `color-mix(in oklch, ${v} 32%, transparent)`,
    );
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* ignore */
    }
  }, []);

  const pick = React.useCallback(
    (key: PaletteKey) => {
      setActive(key);
      applyVars(key);
    },
    [applyVars],
  );

  React.useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as PaletteKey | null;
      if (saved && saved in PALETTES) {
        applyVars(saved);
        queueMicrotask(() => setActive(saved));
      }
    } catch {
      /* ignore */
    }
  }, [applyVars]);

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[100] flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 shadow-lg",
        "text-xs font-medium text-text",
      )}
      role="region"
      aria-label="Developer accent palette preview"
    >
      <div className="section-label">
        Accent (dev) — ⌃⇧P
      </div>
      <div className="flex gap-2">
        {(Object.keys(PALETTES) as PaletteKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => pick(key)}
            className={cn(
              "rounded-md px-3 py-1.5 transition-[transform,background-color,box-shadow]",
              "duration-[80ms] ease-out active:scale-[0.97]",
              active === key
                ? "bg-accent text-white shadow-sm"
                : "bg-bg-elevated text-text hover:bg-border/40",
            )}
          >
            {PALETTES[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}
