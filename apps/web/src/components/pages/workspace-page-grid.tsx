"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Plus } from "lucide-react";
import type { PageOut } from "@/lib/api";
import { cn } from "@/lib/utils";

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn("inline-block size-1.5 shrink-0 rounded-full", {
        "bg-emerald-500": status === "live",
        "bg-amber-400": status === "draft",
        "bg-border-strong": !["live", "draft"].includes(status),
      })}
    />
  );
}

const PAGE_TYPE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  booking: {
    bg: "var(--accent-light)",
    color: "var(--accent)",
    border: "var(--accent-bold)",
  },
  hospitality: {
    bg: "oklch(67% 0.16 72 / 0.12)",
    color: "oklch(67% 0.16 72)",
    border: "oklch(67% 0.16 72 / 0.3)",
  },
  creative: {
    bg: "oklch(60% 0.18 350 / 0.1)",
    color: "oklch(60% 0.18 350)",
    border: "oklch(60% 0.18 350 / 0.25)",
  },
  event: {
    bg: "oklch(58% 0.19 280 / 0.1)",
    color: "oklch(58% 0.19 280)",
    border: "oklch(58% 0.19 280 / 0.25)",
  },
  default: {
    bg: "oklch(55% 0.18 152 / 0.1)",
    color: "oklch(55% 0.18 152)",
    border: "oklch(55% 0.18 152 / 0.28)",
  },
};

function getTypeStyle(pageType: string) {
  const t = pageType.toLowerCase();
  if (t.includes("book") || t.includes("appoint")) return PAGE_TYPE_STYLES.booking;
  if (t.includes("menu") || t.includes("cafe") || t.includes("restaurant"))
    return PAGE_TYPE_STYLES.hospitality;
  if (t.includes("photo") || t.includes("portfolio") || t.includes("creative"))
    return PAGE_TYPE_STYLES.creative;
  if (t.includes("event") || t.includes("rsvp") || t.includes("fitness"))
    return PAGE_TYPE_STYLES.event;
  return PAGE_TYPE_STYLES.default;
}

function PageThumbnail({ page, hovered }: { page: PageOut; hovered: boolean }) {
  const style = getTypeStyle(page.page_type);

  return (
    <div
      className="relative h-[150px] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--bg-elevated) 0%, ${style.bg} 100%)`,
      }}
    >
      {/* Decorative lines mimicking page content */}
      <div className="absolute inset-0 p-4 opacity-40">
        <div
          className="mb-2.5 h-2.5 w-20 rounded-full"
          style={{ background: style.color }}
        />
        <div className="mb-1.5 h-1.5 w-full rounded-full bg-current opacity-15" />
        <div className="mb-1.5 h-1.5 w-4/5 rounded-full bg-current opacity-10" />
        <div className="mb-3 h-1.5 w-3/5 rounded-full bg-current opacity-10" />
        <div
          className="h-7 w-24 rounded-lg opacity-25"
          style={{ background: style.color }}
        />
      </div>
      {/* Type label center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-body text-xs font-medium opacity-30"
          style={{ color: style.color }}
        >
          {page.page_type.replace(/-/g, " ")}
        </span>
      </div>
      {/* Hover: open button */}
      {hovered && (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-white/92 px-2 py-1.5 text-[10px] font-semibold text-text shadow-md backdrop-blur-sm"
          style={{ animation: "var(--animate-fade-in, fadeIn 0.15s ease)" }}
        >
          <ExternalLink className="size-[10px]" aria-hidden />
          Open
        </button>
      )}
    </div>
  );
}

function PageCard({ page }: { page: PageOut }) {
  const [hovered, setHovered] = React.useState(false);
  const typeStyle = getTypeStyle(page.page_type);

  return (
    <li>
      <Link
        href={`/pages/${page.id}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="flex flex-col overflow-hidden rounded-2xl border bg-surface transition-all duration-200"
          style={{
            borderColor: hovered ? "var(--border-strong)" : "var(--border)",
            boxShadow: hovered
              ? "0 10px 28px rgba(0,0,0,0.09)"
              : "0 1px 5px rgba(0,0,0,0.04)",
            transform: hovered ? "translateY(-2px)" : "none",
          }}
        >
          <PageThumbnail page={page} hovered={hovered} />
          <div className="flex items-center justify-between gap-2 px-3.5 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-[13px] font-bold tracking-tight text-text">
                {page.title}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
                <StatusDot status={page.status} />
                <span className="text-text-subtle">·</span>
                <span>
                  {formatDistanceToNow(new Date(page.updated_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
            <span
              className="shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize"
              style={{
                background: typeStyle.bg,
                color: typeStyle.color,
                borderColor: typeStyle.border,
              }}
            >
              {page.page_type.replace(/-/g, " ")}
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function WorkspacePageGrid({
  pages,
  showNewCard = false,
  onNewPage,
  className,
}: {
  pages: PageOut[];
  showNewCard?: boolean;
  onNewPage?: () => void;
  className?: string;
}) {
  return (
    <ul
      className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", className)}
      aria-label="Workspace pages"
    >
      {showNewCard && (
        <li>
          <button
            type="button"
            onClick={onNewPage}
            className={cn(
              "group flex h-full min-h-[210px] w-full flex-col items-center justify-center gap-2 rounded-2xl",
              "border border-dashed border-border-strong/40 bg-transparent",
              "transition-all duration-200 hover:border-accent/50 hover:bg-accent-light",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid",
            )}
          >
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-xl bg-bg-elevated text-text-muted",
                "transition-colors group-hover:bg-accent-light group-hover:text-accent",
              )}
            >
              <Plus className="size-[18px]" aria-hidden />
            </div>
            <span className="font-body text-[13px] font-medium text-text-muted transition-colors group-hover:text-accent">
              New page
            </span>
          </button>
        </li>
      )}
      {pages.map((page) => (
        <PageCard key={page.id} page={page} />
      ))}
    </ul>
  );
}
