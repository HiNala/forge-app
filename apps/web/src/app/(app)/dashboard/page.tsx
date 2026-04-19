"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/chrome/empty-state";
import { WorkspacePageGrid } from "@/components/pages/workspace-page-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { listPages } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

type Filter = "all" | "live" | "draft";

export default function DashboardPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { activeOrganizationId, user } = useForgeSession();
  const [filter, setFilter] = React.useState<Filter>("all");
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 });

  const q = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const pages = q.data ?? [];
  const live = pages.filter((p) => p.status === "live");
  const draft = pages.filter((p) => p.status !== "live" && p.status !== "archived");
  const filtered =
    filter === "live" ? live : filter === "draft" ? draft : pages;

  const firstName =
    user?.display_name?.split(/\s+/)[0] ??
    user?.email?.split("@")[0] ??
    "there";

  React.useLayoutEffect(() => {
    const el = tabRefs.current[filter];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [filter, q.data]);

  if (!activeOrganizationId) {
    return (
      <p className="text-sm text-text-muted font-body">
        Choose a workspace to see your pages.
      </p>
    );
  }

  if (q.isLoading) {
    return (
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <div className="flex border-b border-border pb-0">
          <Skeleton className="h-8 w-14 rounded" />
          <Skeleton className="ml-2 h-8 w-16 rounded" />
          <Skeleton className="ml-2 h-8 w-20 rounded" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-[210px] rounded-[14px]" />
          <Skeleton className="h-[210px] rounded-[14px]" />
          <Skeleton className="h-[210px] rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <p className="text-sm text-danger font-body" role="alert">
        {q.error instanceof Error ? q.error.message : "Could not load pages."}
      </p>
    );
  }

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: `All (${pages.length})` },
    { id: "live", label: `Live (${live.length})` },
    { id: "draft", label: `Drafts (${draft.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Greeting header */}
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight text-text">
          {timeGreeting()}, {firstName}.
        </h1>
        <p className="mt-1 font-body text-[13px] font-light text-text-muted">
          {live.length} live&nbsp;·&nbsp;{draft.length}{" "}
          {draft.length === 1 ? "draft" : "drafts"}
        </p>
      </div>

      {pages.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing here yet"
          description="Create a page in Studio, then publish when you are ready. Your workspace pages and status appear here once you have live or draft pages."
          primaryAction={{
            label: "Open Studio",
            onClick: () => router.push("/studio"),
          }}
          secondaryAction={{
            label: "Browse templates",
            onClick: () => router.push("/templates"),
          }}
        />
      ) : (
        <>
          {/* Filter tabs */}
          <div className="relative flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "relative mb-[-1px] px-4 py-2 font-body text-[13px] transition-colors duration-150",
                  filter === tab.id
                    ? "font-semibold text-text"
                    : "font-normal text-text-muted hover:text-text",
                )}
              >
                {tab.label}
              </button>
            ))}
            <div
              aria-hidden
              className="absolute bottom-0 h-0.5 rounded-t-sm bg-text transition-all duration-200"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>

          {/* Page grid */}
          <WorkspacePageGrid
            pages={filtered}
            showNewCard
            onNewPage={() => router.push("/studio")}
          />
        </>
      )}
    </div>
  );
}
