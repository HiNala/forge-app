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
import { getWorkflowFamily, workflowChipProps } from "@/lib/workflow-config";
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

function PageThumbnail({ page }: { page: PageOut }) {
  const src = page.preview_image_url?.trim();
  const fam = getWorkflowFamily(page.page_type);
  const objectPos =
    fam === "proposal" ? "object-center" : fam === "deck" ? "object-top" : "object-top";
  return (
    <div className="relative h-[140px] overflow-hidden rounded-t-[14px] bg-gradient-to-br from-bg-elevated to-accent-light/30">
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className={cn("object-cover", objectPos)}
          unoptimized={/^https?:\/\//.test(src)}
        />
      ) : null}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          src ? "bg-bg/10" : "opacity-40",
        )}
      >
        <span className="font-body text-xs font-medium text-accent capitalize drop-shadow-sm">
          {page.page_type.replace(/-/g, " ")}
        </span>
      </div>
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
  const wf = workflowChipProps(page.page_type);
  const WfIcon = wf.Icon;

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
          "block rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid",
          keyboardFocused && "ring-2 ring-accent-mid ring-offset-2 ring-offset-bg",
        )}
      >
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-[14px] border bg-surface transition-all duration-[240ms] ease-out motion-reduce:transition-none",
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
            <p className="font-display text-[15px] font-semibold leading-tight tracking-tight text-text line-clamp-2">
              {page.title}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-text-muted font-body">
              <StatusDot status={page.status} />
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-text-subtle capitalize",
                  wf.className,
                )}
              >
                <WfIcon className="size-3 shrink-0 opacity-90" aria-hidden />
                {page.page_type.replace(/-/g, " ")}
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
