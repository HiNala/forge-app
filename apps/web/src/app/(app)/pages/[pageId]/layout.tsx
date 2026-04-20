"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { LayoutGroup, motion } from "framer-motion";
import { ExternalLink, MoreHorizontal, Pencil, Presentation, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { duplicatePage, getPage, listPageSubmissions, patchPage } from "@/lib/api";
import { getWorkflowSurfaceConfig } from "@/lib/workflow-config";
import { cn } from "@/lib/utils";
import { PageDetailProvider } from "@/providers/page-detail-provider";
import { useForgeSession } from "@/providers/session-provider";

function statusVariant(status: string): "live" | "draft" | "archived" {
  if (status === "live") return "live";
  if (status === "archived") return "archived";
  return "draft";
}

export default function PageDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const pageId = typeof params.pageId === "string" ? params.pageId : "";
  const { getToken } = useAuth();
  const { activeOrganizationId, activeOrg } = useForgeSession();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["page", activeOrganizationId, pageId],
    queryFn: () => getPage(getToken, activeOrganizationId, pageId),
    enabled: !!activeOrganizationId && !!pageId,
  });

  const qSubCount = useQuery({
    queryKey: ["submissions-count", activeOrganizationId, pageId],
    queryFn: async () => {
      const r = await listPageSubmissions(getToken, activeOrganizationId, pageId, { limit: 100 });
      return r.next_before ? "99+" : String(r.items.length);
    },
    enabled: !!activeOrganizationId && !!pageId,
  });

  const refetch = React.useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["page", activeOrganizationId, pageId] });
    return q.refetch();
  }, [qc, activeOrganizationId, pageId, q]);

  if (!activeOrganizationId) {
    return <p className="text-sm text-text-muted font-body">Choose a workspace.</p>;
  }

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
        <Skeleton className="h-12 w-full rounded-md" />
        {children}
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-danger font-body" role="alert">
          {q.error instanceof Error ? q.error.message : "Page not found."}
        </p>
        <Button type="button" variant="secondary" onClick={() => router.push("/dashboard")}>
          Back to pages
        </Button>
      </div>
    );
  }

  const p = q.data;
  const wf = getWorkflowSurfaceConfig(p.page_type);
  const base = `/pages/${pageId}`;
  const isOverview = pathname === base || pathname === `${base}/`;
  const isSubmissions = pathname.includes("/submissions");
  const isAutomations = pathname.includes("/automations");
  const isExport = pathname.includes("/export");
  const isAnalytics = pathname.includes("/analytics");
  const wfCfg = getPageDetailConfig(p.page_type);

  const subLabel = qSubCount.isLoading ? "…" : (qSubCount.data ?? "0");

  function openLive() {
    if (!activeOrg?.organization_slug) return;
    const url =
      p.status === "live"
        ? `${window.location.origin}/p/${activeOrg.organization_slug}/${p.slug}`
        : `${window.location.origin}/p/${activeOrg.organization_slug}/${p.slug}?preview=true`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const middlePath = `${base}${wf.middleTab.hrefSuffix}`;
  const middleActive =
    wf.middleTab.id === "export" ? isExport : isAutomations && !isExport;

  const tabs: { href: string; label: string; active: boolean }[] = [
    { href: base, label: "Overview", active: isOverview },
    {
      href: `${base}/submissions`,
      label: `${wf.submissionsTabLabel} (${subLabel})`,
      active: isSubmissions,
    },
    { href: middlePath, label: wf.middleTab.label, active: middleActive },
    { href: `${base}/analytics`, label: "Analytics", active: isAnalytics },
  ];

  return (
    <PageDetailProvider page={p} refetch={refetch}>
      <div className="space-y-0 pb-10">
        {/* Page header */}
        <div className="border-b border-border pb-5 pt-1">
          <nav className="mb-3 flex items-center gap-1.5 font-body text-xs" aria-label="Breadcrumb">
            <Link href="/dashboard" className="text-text-muted hover:text-text transition-colors">
              Pages
            </Link>
            <span className="text-border-strong">/</span>
            <span className="truncate text-text-subtle">{p.title}</span>
          </nav>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-text truncate">
                {p.title}
              </h1>
              <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (!activeOrg?.organization_slug) return;
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/p/${activeOrg.organization_slug}/${p.slug}`,
                  );
                  toast.success("Link copied");
                }}
              >
                <Share2 className="size-3.5" />
                Share
              </Button>
              {wf.headerActions === "deck" ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      if (!activeOrg?.organization_slug) return;
                      window.open(
                        `${window.location.origin}/p/${activeOrg.organization_slug}/${p.slug}?mode=present`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <Presentation className="size-3.5" />
                    Present
                  </Button>
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <Link href={`${base}/export`}>Export</Link>
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={openLive}
                className="gap-1.5"
              >
                <ExternalLink className="size-3.5" />
                {wf.headerActions === "proposal" ? "Share link" : "Open live"}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => router.push(`/studio?pageId=${pageId}`)}
                className="gap-1.5"
              >
                <Pencil className="size-3.5" />
                Edit in Studio
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="secondary" size="sm" className="px-2" aria-label="More page actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        const r = await duplicatePage(getToken, activeOrganizationId, pageId);
                        if ((r as { id?: string }).id) {
                          router.push(`/studio?pageId=${(r as { id: string }).id}`);
                        } else {
                          toast.message("Duplicate is not available yet.");
                        }
                      } catch {
                        toast.error("Could not duplicate page.");
                      }
                    }}
                  >
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      if (!confirm("Archive this page? It will stop accepting new submissions.")) return;
                      try {
                        await patchPage(getToken, activeOrganizationId, pageId, { status: "archived" });
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
                    onClick={() => toast.message("Delete is available after grace-period backend lands.")}
                  >
                    Delete…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <LayoutGroup>
          <div
            role="tablist"
            aria-label="Page sections"
            className="mb-8 mt-1 flex w-full flex-wrap gap-1 border-b border-border"
          >
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                role="tab"
                aria-selected={t.active}
                className={cn(
                  "relative mb-[-1px] inline-flex px-3 py-2.5 font-body text-sm transition-colors",
                  t.active ? "font-semibold text-text" : "font-medium text-text-muted hover:text-text",
                )}
              >
                {t.active ? (
                  <motion.span
                    layoutId="page-detail-tab-indicator"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-text"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10">{t.label}</span>
              </Link>
            ))}
          </div>
        </LayoutGroup>

        {children}
      </div>
    </PageDetailProvider>
  );
}
