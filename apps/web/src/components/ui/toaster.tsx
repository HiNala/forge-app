"use client";

import { Toaster as Sonner } from "sonner";
import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Global toast host: bottom-right on desktop, bottom-center on narrow viewports (safe-area aware).
 */
export function AppToaster() {
  const desktop = useMediaQuery("(min-width: 768px)");
  return (
    <Sonner
      position={desktop ? "bottom-right" : "bottom-center"}
      duration={4000}
      closeButton
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "rounded-[10px] border-[1.5px] border-border bg-surface text-text shadow-lg font-body animate-[toast-in_0.2s_var(--ease-out)_both]",
          title: "font-medium text-text",
          description: "text-text-muted text-sm",
          success: "border-emerald-500/30",
          error: "border-danger/40",
          warning: "border-amber-500/35",
          info: "border-sky-500/35",
        },
      }}
    />
  );
}
