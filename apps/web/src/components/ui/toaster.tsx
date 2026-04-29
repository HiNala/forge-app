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
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "relative max-w-[min(420px,calc(100vw-2rem))] rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 text-[15px] font-medium leading-snug text-text shadow-lg font-body animate-toast-in before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-(image:--brand-gradient)",
          title: "font-semibold text-text",
          description: "text-text-muted text-[13px] leading-normal",
          success: "border-border",
          error: "border-border",
          warning: "border-border",
          info: "border-border",
        },
      }}
    />
  );
}
