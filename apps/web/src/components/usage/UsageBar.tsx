"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type UsageBarProps = {
  label?: string;
  sublabel?: string;
  /** 0–100 consumption (how much of the cap is used). */
  percentUsed: number;
  used: number;
  cap: number;
  resetPhrase?: string;
  className?: string;
};

function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (onStore) => {
      if (typeof window === "undefined") return () => {};
      const q = window.matchMedia("(prefers-reduced-motion: reduce)");
      q.addEventListener("change", onStore);
      return () => q.removeEventListener("change", onStore);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Claude-style horizontal usage bar — four visual bands by consumption (P-04).
 */
export function UsageBar({
  label,
  sublabel,
  percentUsed,
  used,
  cap,
  resetPhrase,
  className,
}: UsageBarProps) {
  const pct = Math.min(100, Math.max(0, percentUsed));
  const band = pct >= 100 ? "limit" : pct >= 90 ? "90" : pct >= 70 ? "70" : "ok";
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-body text-sm font-semibold text-text">{label}</p>
            {sublabel ? (
              <p className="mt-0.5 font-body text-xs text-text-muted">{sublabel}</p>
            ) : null}
          </div>
          {band === "limit" ? (
            <span className="shrink-0 font-body text-xs font-medium text-danger">Limit reached</span>
          ) : (
            <span className="shrink-0 font-body text-sm font-medium tabular-nums text-text-muted">
              {Math.round(pct)}% used
            </span>
          )}
        </div>
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative h-2.5 w-full cursor-default overflow-hidden rounded-full outline-none",
              "bg-neutral-200 dark:bg-neutral-800",
            )}
            role="progressbar"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-label={
              label
                ? `${label}: ${used} of ${cap} credits used`
                : `${used} of ${cap} credits used`
            }
          >
            <div
              className={cn(
                "h-full rounded-full",
                !reduceMotion && "transition-[width] duration-500 ease-out",
                band === "limit" && "bg-red-500/80",
                band === "90" && "bg-orange-500",
                band === "70" && "bg-amber-500",
                band === "ok" && "bg-accent",
              )}
              style={{ width: band === "limit" ? "100%" : `${pct}%` }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs font-body text-xs">
          {used.toLocaleString()} / {cap.toLocaleString()} credits used
        </TooltipContent>
      </Tooltip>
      {resetPhrase ? (
        <p className="mt-1 font-body text-xs text-text-muted">{resetPhrase}</p>
      ) : null}
      <p className="mt-0.5 font-body text-xs tabular-nums text-text-subtle">
        {used.toLocaleString()} / {cap.toLocaleString()} credits
      </p>
    </div>
  );
}
