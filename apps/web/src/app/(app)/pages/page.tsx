"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { EmptyState } from "@/components/chrome/empty-state";
import { WorkspacePageGrid } from "@/components/pages/workspace-page-grid";
import { listPages } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

type Filter = "all" | "live" | "draft";

export default function PagesIndexPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const [filter, setFilter] = React.useState<Filter>("all");

  const q = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  if (!activeOrganizationId) {
    return (
      <p className="font-body text-sm text-text-muted">
        Choose a workspace to see your mini-apps.
      </p>
    );
  }

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-bg-elevated" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="h-[210px] animate-pulse rounded-2xl bg-bg-elevated" />
          <div className="h-[210px] animate-pulse rounded-2xl bg-bg-elevated" />
          <div className="h-[210px] animate-pulse rounded-2xl bg-bg-elevated" />
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <p className="font-body text-sm text-danger" role="alert">
        {q.error instanceof Error ? q.error.message : "Could not load pages."}
      </p>
    );
  }

  const pages = q.data ?? [];
  const live = pages.filter((p) => p.status === "live");
  const draft = pages.filter((p) => p.status === "draft");

  const filtered =
    filter === "live" ? live : filter === "draft" ? draft : pages;

  const filterTabs: { label: string; value: Filter; count: number }[] = [
    { label: "All", value: "all", count: pages.length },
    { label: "Live", value: "live", count: live.length },
    { label: "Drafts", value: "draft", count: draft.length },
  ];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="pb-5">
        <h1
          className="font-display font-bold text-text"
          style={{ fontSize: "clamp(24px, 3vw, 30px)", letterSpacing: "-0.01em", lineHeight: 1 }}
        >
          My pages
        </h1>
        <p className="mt-1 font-body text-[13px] font-light text-text-muted">
          {live.length} live
          {draft.length > 0 && ` · ${draft.length} draft${draft.length === 1 ? "" : "s"}`}
          {pages.length === 0 && " — forms, decks, and other mini-apps start in Studio"}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-0 border-b border-border">
        {filterTabs.map(({ label, value, count }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 font-body text-[13px] transition-colors",
              filter === value
                ? "font-semibold text-text border-text"
                : "font-medium text-text-muted border-transparent hover:text-text hover:border-border-strong",
            )}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 text-[11px] text-text-subtle">({count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 && filter === "all" ? (
        <EmptyState
          title="Nothing here yet. Let&apos;s make something."
          description="Start in Studio with a plain-English prompt, or browse templates when you want a polished starting point."
          primaryAction={{ label: "Create your first page", onClick: () => router.push("/studio") }}
          secondaryAction={{ label: "Browse templates", onClick: () => router.push("/app-templates") }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`No ${filter === "live" ? "live" : "draft"} pages yet.`}
          description={
            filter === "live"
              ? "Publish a draft when it is ready, and your live work will appear here."
              : "Drafts show up here when you start something in Studio."
          }
          primaryAction={{ label: "Open Studio", onClick: () => router.push("/studio") }}
        />
      ) : (
        <WorkspacePageGrid
          pages={filtered}
          showNewCard
          onNewPage={() => router.push("/studio")}
        />
      )}
    </div>
  );
}
