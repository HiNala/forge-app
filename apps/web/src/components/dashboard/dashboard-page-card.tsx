"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Archive, ExternalLink, MoreHorizontal, Pencil } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { patchPage, type PageOut } from "@/lib/api";
import { getWorkflowSurfaceConfig } from "@/lib/workflow-config";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { useForgeSession } from "@/providers/session-provider";

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn("inline-block size-1.5 shrink-0 rounded-full", {
        "bg-emerald-500": status === "live",
        "bg-amber-400": status === "draft",
        "bg-zinc-400": status === "archived",
      })}
    />
  );
}

const TYPE_PALETTE: Record<string, { from: string; accent: string }> = {
  proposal:     { from: "oklch(67% 0.16 72 / 0.18)",   accent: "oklch(67% 0.16 72)" },
  pitch_deck:   { from: "oklch(58% 0.19 280 / 0.16)",  accent: "oklch(58% 0.19 280)" },
  "booking-form":   { from: "oklch(50% 0.15 192 / 0.16)", accent: "oklch(50% 0.15 192)" },
  "contact-form":   { from: "oklch(50% 0.15 192 / 0.16)", accent: "oklch(50% 0.15 192)" },
  rsvp:         { from: "oklch(60% 0.18 350 / 0.14)",  accent: "oklch(60% 0.18 350)" },
  landing:      { from: "oklch(55% 0.18 152 / 0.14)",  accent: "oklch(55% 0.18 152)" },
};

function getTypePalette(pageType: string) {
  return (
    TYPE_PALETTE[pageType] ??
    (pageType.includes("booking") ? TYPE_PALETTE["booking-form"] :
     pageType.includes("contact") ? TYPE_PALETTE["contact-form"] :
     { from: "oklch(50% 0.15 192 / 0.12)", accent: "oklch(50% 0.15 192)" })
  );
}

function PageThumbnail({ page }: { page: PageOut }) {
  const src = page.preview_image_url?.trim();
  const palette = getTypePalette(page.page_type);

  return (
    <div
      className="relative h-[156px] overflow-hidden rounded-t-2xl"
      style={{ background: `linear-gradient(135deg, ${palette.from} 0%, var(--bg-elevated) 70%)` }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover object-top"
          unoptimized={/^https?:\/\//.test(src)}
        />
      ) : (
        /* Decorative page chrome lines */
        <div className="absolute inset-5 flex flex-col gap-2.5" aria-hidden>
          <div
            className="h-3 w-2/5 rounded-full opacity-30"
            style={{ background: palette.accent }}
          />
          <div className="h-2 w-3/4 rounded-full bg-current opacity-10" />
          <div className="h-2 w-1/2 rounded-full bg-current opacity-[0.07]" />
          <div
            className="mt-2 h-9 w-full rounded-xl opacity-[0.08]"
            style={{ background: palette.accent }}
          />
          <div className="h-2 w-5/6 rounded-full bg-current opacity-[0.06]" />
          <div className="h-2 w-2/3 rounded-full bg-current opacity-[0.06]" />
        </div>
      )}
      {/* Type label */}
      <span
        className="absolute bottom-3 left-3 font-body text-[11px] font-semibold capitalize"
        style={{ color: palette.accent }}
      >
        {page.page_type.replace(/-/g, " ")}
      </span>
    </div>
  );
}

export function DashboardPageCard({
  page,
  unread,
  keyboardFocused,
  onMouseEnterCard,
  onEdit,
}: {
  page: PageOut;
  unread: number;
  keyboardFocused?: boolean;
  onMouseEnterCard?: () => void;
  onEdit: (e: React.MouseEvent) => void;
}) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { activeOrganizationId, activeOrg } = useForgeSession();
  const [hovered, setHovered] = React.useState(false);
  const wf = getWorkflowSurfaceConfig(page.page_type);
  const WfIcon = wf.chipIcon;

  const openLive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeOrg?.organization_slug) return;
    const u =
      page.status === "live"
        ? `${window.location.origin}/p/${activeOrg.organization_slug}/${page.slug}`
        : `${window.location.origin}/p/${activeOrg.organization_slug}/${page.slug}?preview=true`;
    window.open(u, "_blank", "noopener,noreferrer");
  };

  return (
    <li
      onMouseEnter={() => {
        setHovered(true);
        onMouseEnterCard?.();
      }}
      onMouseLeave={() => setHovered(false)}
      className="relative list-none"
    >
      <Link
        href={`/pages/${page.id}`}
        className={cn(
          "block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid",
          keyboardFocused && "ring-2 ring-accent-mid ring-offset-2 ring-offset-bg",
        )}
      >
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-2xl border bg-surface transition-all duration-[240ms] ease-out motion-reduce:transition-none",
            hovered
              ? "border-border-strong shadow-lg -translate-y-0.5 motion-reduce:translate-y-0 motion-reduce:shadow-md"
              : "border-border shadow-sm",
          )}
        >
          <div className="relative">
            <PageThumbnail page={page} />
            {hovered ? (
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  type="button"
                  className="rounded-lg bg-white/95 p-1.5 text-text shadow-md backdrop-blur hover:bg-white"
                  aria-label="Edit in Studio"
                  onClick={onEdit}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-white/95 p-1.5 text-text shadow-md backdrop-blur hover:bg-white"
                  aria-label="Open live"
                  onClick={openLive}
                >
                  <ExternalLink className="size-4" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-lg bg-white/95 p-1.5 text-text shadow-md backdrop-blur hover:bg-white"
                      aria-label="More actions"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/studio?pageId=${page.id}`);
                      }}
                    >
                      Duplicate (soon)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!activeOrganizationId) return;
                        try {
                          await patchPage(getToken, activeOrganizationId, page.id, { status: "archived" });
                          toast.success("Archived");
                          router.refresh();
                        } catch {
                          toast.error("Could not archive");
                        }
                      }}
                    >
                      <Archive className="size-4" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
            {unread > 0 ? (
              <span className="absolute left-2 top-2 min-w-6 rounded-full bg-accent px-2 py-0.5 text-center text-[11px] font-bold text-white shadow">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 px-3.5 py-3">
            <p className="font-display text-[15px] font-bold leading-tight tracking-tight text-text line-clamp-2">
              {page.title}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-text-muted font-body">
              <StatusDot status={page.status} />
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] capitalize",
                  wf.chipClassName,
                )}
              >
                <WfIcon className="size-3 shrink-0 opacity-90" aria-hidden />
                {wf.chipLabel}
              </span>
              <span>·</span>
              <span>
                updated{" "}
                {formatDistanceToNow(new Date(page.updated_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}
