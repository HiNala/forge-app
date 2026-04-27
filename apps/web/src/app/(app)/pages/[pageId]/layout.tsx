"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { LayoutGroup, motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  MoreHorizontal,
  Pencil,
  Presentation,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  duplicatePage,
  getPage,
  listPageSubmissions,
  patchPage,
  publishPage,
} from "@/lib/api";
import { getWorkflowSurfaceConfig } from "@/lib/workflow-config";
import { ensureBridgeInFullDocument } from "@/lib/studio-preview-html";
import { cn } from "@/lib/utils";
import { PageDetailProvider } from "@/providers/page-detail-provider";
import { useForgeSession } from "@/providers/session-provider";

const PAGE_TYPE_ACCENT: Record<string, { bg: string; color: string; border: string }> = {
  booking: {
    bg: "var(--color-accent-light)",
    color: "var(--color-accent)",
    border: "var(--color-accent-bold)",
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
  deck: {
    bg: "oklch(58% 0.19 280 / 0.1)",
    color: "oklch(58% 0.19 280)",
    border: "oklch(58% 0.19 280 / 0.25)",
  },
  proposal: {
    bg: "oklch(67% 0.16 72 / 0.12)",
    color: "oklch(67% 0.16 72)",
    border: "oklch(67% 0.16 72 / 0.3)",
  },
  default: {
    bg: "oklch(55% 0.18 152 / 0.1)",
    color: "oklch(55% 0.18 152)",
    border: "oklch(55% 0.18 152 / 0.28)",
  },
};

function getTypeAccent(pageType: string) {
  const t = pageType.toLowerCase();
  if (t.includes("book") || t.includes("appoint")) return PAGE_TYPE_ACCENT.booking;
  if (t.includes("menu") || t.includes("cafe") || t.includes("restaurant"))
    return PAGE_TYPE_ACCENT.hospitality;
  if (t.includes("photo") || t.includes("portfolio") || t.includes("creative"))
    return PAGE_TYPE_ACCENT.creative;
  if (t.includes("event") || t.includes("rsvp") || t.includes("fitness"))
    return PAGE_TYPE_ACCENT.event;
  if (t === "pitch_deck") return PAGE_TYPE_ACCENT.deck;
  if (t === "proposal") return PAGE_TYPE_ACCENT.proposal;
  return PAGE_TYPE_ACCENT.default;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "live"
      ? "var(--color-success)"
      : status === "archived"
        ? "var(--color-text-subtle)"
        : "var(--color-warning)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "11px",
        fontWeight: 500,
        color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {status === "live" ? "Live" : status === "archived" ? "Archived" : "Draft"}
    </span>
  );
}

export default function PageDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const pageId = typeof params.pageId === "string" ? params.pageId : "";
  const { getToken } = useAuth();
  const { activeOrganizationId, activeOrg } = useForgeSession();
  const qc = useQueryClient();

  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const q = useQuery({
    queryKey: ["page", activeOrganizationId, pageId],
    queryFn: () => getPage(getToken, activeOrganizationId, pageId),
    enabled: !!activeOrganizationId && !!pageId,
  });

  const qSubCount = useQuery({
    queryKey: ["submissions-count", activeOrganizationId, pageId],
    queryFn: async () => {
      const r = await listPageSubmissions(getToken, activeOrganizationId, pageId, {
        limit: 100,
      });
      return r.next_before ? "99+" : String(r.items.length);
    },
    enabled: !!activeOrganizationId && !!pageId,
  });

  const [publishing, setPublishing] = React.useState(false);

  const refetch = React.useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["page", activeOrganizationId, pageId] });
    return q.refetch();
  }, [qc, activeOrganizationId, pageId, q]);

  async function handlePublish() {
    if (!activeOrganizationId) return;
    setPublishing(true);
    try {
      await publishPage(getToken, activeOrganizationId, pageId);
      toast.success("Page is live", { description: "Your page is now publicly accessible." });
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish page.");
    } finally {
      setPublishing(false);
    }
  }

  if (!activeOrganizationId) {
    return (
      <p className="text-sm text-text-muted font-body">Choose a workspace.</p>
    );
  }

  if (q.isLoading) {
    return (
      <div
        className="-mx-6 -mt-6 -mb-[max(1.5rem,env(safe-area-inset-bottom))] md:-mx-8 md:-mt-8 md:-mb-8 flex overflow-hidden"
        style={{ height: "calc(100svh - 3.5rem)" }}
      >
        <div className="flex flex-1 flex-col bg-bg-elevated">
          <div className="h-11 border-b border-border" />
          <Skeleton className="flex-1 rounded-none" />
        </div>
        <div className="flex w-[340px] flex-col border-l border-border bg-surface p-5 gap-4">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-danger font-body" role="alert">
          {q.error instanceof Error ? q.error.message : "Page not found."}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/dashboard")}
        >
          Back to pages
        </Button>
      </div>
    );
  }

  const p = q.data;
  const wf = getWorkflowSurfaceConfig(p.page_type);
  const typeAccent = getTypeAccent(p.page_type);
  const base = `/pages/${pageId}`;
  const isShare = pathname === base || pathname === `${base}/`;
  const isSubmissions = pathname.includes("/submissions");
  const isAutomations = pathname.includes("/automations");
  const isExport = pathname.includes("/export");
  const isAnalytics = pathname.includes("/analytics");

  const subLabel = qSubCount.isLoading ? "…" : (qSubCount.data ?? "0");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl =
    activeOrg?.organization_slug && p.slug
      ? `${origin}/p/${activeOrg.organization_slug}/${p.slug}`
      : "";

  const previewSrc = ensureBridgeInFullDocument(
    p.current_html || "<p style='font-family:sans-serif;padding:2rem;color:#888'>No content yet.</p>",
    origin,
  );

  function openLive() {
    if (!publicUrl) return;
    window.open(
      p.status === "live" ? publicUrl : `${publicUrl}?preview=true`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const tabs: { href: string; label: string; active: boolean; badge?: string }[] = [
    { href: base, label: "Overview", active: isShare },
    {
      href: `${base}/submissions`,
      label: wf.submissionsTabLabel,
      active: isSubmissions,
      badge: subLabel !== "0" ? subLabel : undefined,
    },
    { href: `${base}/automations`, label: wf.automationsTabLabel, active: isAutomations },
    { href: `${base}/export`, label: "Export", active: isExport },
    { href: `${base}/analytics`, label: "Analytics", active: isAnalytics },
  ];

  return (
    <PageDetailProvider page={p} refetch={refetch}>
      {/* Full-bleed split layout — escapes shell padding */}
      <div
        className="-mx-6 -mt-6 -mb-[max(1.5rem,env(safe-area-inset-bottom))] md:-mx-8 md:-mt-8 md:-mb-8 flex overflow-hidden"
        style={{ height: "calc(100svh - 3.5rem)" }}
      >
        {/* ── Left: iframe preview ── */}
        <div className="flex flex-1 flex-col overflow-hidden bg-bg-elevated">
          {/* Chrome bar */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-surface px-3.5">
            <div className="flex gap-1.5 shrink-0" aria-hidden>
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex flex-1 items-center gap-1.5 overflow-hidden rounded-md border border-border bg-bg-elevated px-2.5 py-1 min-w-0">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-text-subtle"
                aria-hidden
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span className="truncate font-body text-[11px] text-text-muted">
                {publicUrl || "forge.page/preview"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.back()}
              title="Back"
              className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1 font-body text-[11px] font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <ArrowLeft className="size-3" aria-hidden />
              Back
            </button>
            <button
              type="button"
              onClick={openLive}
              title="Open in new tab"
              className="flex shrink-0 items-center justify-center rounded-md border border-border p-1.5 text-text-muted transition-colors hover:border-accent hover:text-accent"
              aria-label="Open page in new tab"
            >
              <ExternalLink className="size-3" />
            </button>
          </div>
          {/* Iframe */}
          <iframe
            title="Page preview"
            aria-label="Live page preview"
            className="flex-1 w-full border-0 bg-white"
            srcDoc={previewSrc}
            sandbox="allow-forms allow-same-origin allow-scripts"
          />
        </div>

        {/* ── Right: detail panel ── */}
        <div className="flex w-[340px] shrink-0 flex-col overflow-hidden border-l border-border bg-surface">
          {/* Panel header */}
          <div className="shrink-0 border-b border-border px-[18px] pt-4 pb-0">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <h2
                className="min-w-0 truncate font-display text-[20px] font-bold tracking-tight text-text"
                style={{ letterSpacing: "-0.01em" }}
              >
                {p.title}
              </h2>
              <span
                className="shrink-0 rounded-[10px] border px-2 py-0.5 text-[10px] font-semibold capitalize"
                style={{
                  background: typeAccent.bg,
                  color: typeAccent.color,
                  borderColor: typeAccent.border,
                }}
              >
                {p.page_type.replace(/-/g, " ")}
              </span>
            </div>
            <div className="mb-3 flex items-center gap-3">
              <StatusDot status={p.status} />
              <span className="font-body text-[11px] text-text-subtle">
                {p.updated_at
                  ? new Date(p.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </span>
            </div>

            {/* Tabs */}
            <LayoutGroup>
              <div
                role="tablist"
                aria-label="Page sections"
                className="relative flex"
              >
                {tabs.map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    role="tab"
                    aria-selected={t.active}
                    ref={(el) => {
                      /* store as button-like element for indicator */
                      (tabRefs.current as Record<string, HTMLElement | null>)[t.href] = el;
                    }}
                    className={cn(
                      "relative mb-[-1px] inline-flex items-center gap-1 px-3 py-2 font-body text-[12px] transition-colors",
                      t.active
                        ? "font-semibold text-text"
                        : "font-medium text-text-muted hover:text-text",
                    )}
                  >
                    {t.active ? (
                      <motion.span
                        layoutId="page-panel-tab-indicator"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-text"
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    ) : null}
                    <span className="relative z-10">{t.label}</span>
                    {t.badge && (
                      <span
                        className="relative z-10 rounded-md px-1.5 py-px text-[9px] font-bold"
                        style={{
                          background: "var(--color-accent)",
                          color: "#fff",
                        }}
                      >
                        {t.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </LayoutGroup>
          </div>

          {/* Scrollable tab content */}
          <div className="flex-1 overflow-auto px-[18px] py-4">
            {children}
          </div>

          {/* Panel footer — action buttons */}
          <div className="shrink-0 border-t border-border px-[18px] py-3 flex items-center gap-2">
            {p.status !== "live" && p.status !== "archived" ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-1 gap-1.5"
                loading={publishing}
                onClick={() => void handlePublish()}
              >
                <Globe className="size-3" />
                Go Live
              </Button>
            ) : null}
            <Button
              type="button"
              variant={p.status !== "live" ? "secondary" : "primary"}
              size="sm"
              className={cn("gap-1.5", p.status === "live" && "flex-1")}
              onClick={() => router.push(`/studio?pageId=${pageId}`)}
            >
              <Pencil className="size-3" />
              Edit
            </Button>
            {wf.headerActions === "deck" && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (!activeOrg?.organization_slug) return;
                  window.open(
                    `${origin}/p/${activeOrg.organization_slug}/${p.slug}?mode=present`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <Presentation className="size-3" />
                Present
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="px-2"
                  aria-label="More page actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const r = await duplicatePage(getToken, activeOrganizationId, pageId);
                      router.push(`/studio?pageId=${r.id}`);
                    } catch {
                      toast.error("Could not duplicate page.");
                    }
                  }}
                >
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    if (
                      !confirm("Archive this page? It will stop accepting new submissions.")
                    )
                      return;
                    try {
                      await patchPage(getToken, activeOrganizationId, pageId, {
                        status: "archived",
                      });
                      toast.success("Page archived.");
                      void refetch();
                    } catch {
                      toast.error("Could not archive.");
                    }
                  }}
                >
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-danger"
                  onClick={() =>
                    toast.message("Delete is available after grace-period backend lands.")
                  }
                >
                  Delete…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </PageDetailProvider>
  );
}
