"use client";

import * as React from "react";
import { Info } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type UsageBarState = "normal" | "warning" | "exceeded";

type UsageBarProps = {
  label: string;
  description?: string;
  /** @deprecated use `description` */
  sublabel?: string;
  /** 0–100 of cap consumed. (Alias: `percentUsed`.) */
  percent?: number;
  percentUsed?: number;
  used: number;
  cap: number;
  resetText?: string;
  /** @deprecated use resetText */
  resetPhrase?: string;
  state?: UsageBarState;
  learnMoreHref?: string;
  infoTooltip?: string;
  className?: string;
  /** Default: app surfaces. `inverse` = dark panel (Studio footer). */
  variant?: "default" | "inverse";
  /** Replaces the default “used / cap credits” line (e.g. dollar amounts). */
  valueDetail?: string;
  /** Alias of `valueDetail` (P-09 naming). */
  valueText?: string;
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
 * Calm horizontal usage bar — one accent, warm amber as limit (not an error state).
 * P-09: 600ms fill, role=progressbar, stacked label + percent row.
 */
export function UsageBar({
  label,
  description: descriptionOpt,
  sublabel,
  percent: percentProp,
  percentUsed,
  used,
  cap,
  resetText,
  resetPhrase,
  state: stateProp,
  learnMoreHref,
  infoTooltip,
  className,
  variant = "default",
  valueDetail,
  valueText,
}: UsageBarProps) {
  const description = descriptionOpt ?? sublabel;
  const reduceMotion = usePrefersReducedMotion();
  if (cap <= 0) {
    const detail = valueText ?? valueDetail;
    return (
      <div className={cn("w-full space-y-1", className)}>
        <p
          className={cn(
            "font-body text-[15px] font-semibold leading-snug",
            variant === "inverse" ? "text-white/90" : "text-text",
          )}
        >
          {label}
        </p>
        {description ? (
          <p
            className={cn(
              "font-body text-[13px] leading-snug",
              variant === "inverse" ? "text-white/60" : "text-text-muted",
            )}
          >
            {description}
          </p>
        ) : null}
        <p className={cn("font-body text-[12px]", variant === "inverse" ? "text-white/45" : "text-text-subtle")}>
          {detail ?? "No limit to display yet."}
        </p>
      </div>
    );
  }
  const rawPct = percentUsed ?? percentProp ?? 0;
  const pct = Math.min(100, Math.max(0, rawPct));
  const reset = resetText ?? resetPhrase;

  const derivedState: UsageBarState =
    stateProp ?? (pct >= 100 ? "exceeded" : pct >= 95 ? "warning" : "normal");
  const showApproachTag = derivedState === "warning" && pct < 100;
  const fillClass =
    derivedState === "exceeded" || pct >= 100
      ? "bg-usage-fill-full"
      : derivedState === "warning"
        ? "bg-usage-fill-approach"
        : "bg-usage-fill";

  const inv = variant === "inverse";
  const track = inv ? "bg-white/12" : "bg-usage-track";
  const textMuted = inv ? "text-white/60" : "text-text-muted";
  const textSubtle = inv ? "text-white/45" : "text-text-subtle";
  const textDefault = inv ? "text-white/90" : "text-text";
  const tagClass = inv ? "text-usage-fill-approach" : "text-warning";

  const ariaPct = Math.round(pct);
  const srText = `${ariaPct} percent of ${cap.toLocaleString()} used. ${used.toLocaleString()} of ${cap.toLocaleString()}. ${
    reset ? `${reset}.` : ""
  }`;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("flex items-center gap-1.5 font-body text-[15px] font-semibold leading-snug", textDefault)}>
            {label}
            {infoTooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex rounded p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      inv ? "text-white/50 hover:text-white/80" : "text-text-muted hover:text-text",
                    )}
                    aria-label="More about this limit"
                  >
                    <Info className="size-3.5" strokeWidth={1.5} aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs font-body text-xs">{infoTooltip}</TooltipContent>
              </Tooltip>
            ) : null}
          </p>
          {description ? (
            <p className={cn("mt-1 font-body text-[13px] leading-snug", textMuted)}>{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {showApproachTag ? (
            <span className={cn("font-body text-[11px] font-medium", tagClass)}>Approaching limit</span>
          ) : null}
          <span
            className={cn(
              "font-body text-[15px] font-medium tabular-nums",
              textMuted,
              (derivedState === "exceeded" || pct >= 100) && "text-[color:var(--color-usage-fill-full)]",
            )}
          >
            {Math.round(pct)}%
            {learnMoreHref ? (
              <>
                {" "}
                <Link
                  href={learnMoreHref}
                  className={cn("text-[12px] font-medium underline-offset-2", inv ? "text-accent" : "text-accent hover:underline")}
                >
                  Learn more
                </Link>
              </>
            ) : null}
          </span>
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative h-2.5 w-full cursor-default overflow-hidden rounded-full outline-none",
              track,
            )}
            role="progressbar"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ariaPct}
            aria-label={label}
            aria-valuetext={srText}
          >
            <div
              className={cn(
                "h-full max-w-full rounded-full",
                !reduceMotion && "transition-[width] ease-standard",
                !reduceMotion && "duration-[var(--duration-usage,600ms)]",
                fillClass,
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs font-body text-xs">
          {used.toLocaleString()} / {cap.toLocaleString()} — {Math.round(pct)}% used
        </TooltipContent>
      </Tooltip>

      {reset ? <p className={cn("mt-2 font-body text-[12px] leading-normal", textMuted)}>{reset}</p> : null}
      <p className={cn("mt-1 font-body text-[12px] tabular-nums", textSubtle, inv && "text-white/40")}>
        {valueText ?? valueDetail ?? `${used.toLocaleString()} / ${cap.toLocaleString()} credits`}
      </p>
    </div>
  );
}
