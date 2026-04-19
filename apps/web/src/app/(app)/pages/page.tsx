"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { WorkspacePageGrid } from "@/components/pages/workspace-page-grid";
import { Button } from "@/components/ui/button";
import { listPages } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

export default function PagesIndexPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();

  const q = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  if (!activeOrganizationId) {
    return (
      <p className="font-body text-sm text-text-muted">
        Choose a workspace to see your pages.
      </p>
    );
  }

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-bg-elevated" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="h-36 animate-pulse rounded-2xl bg-bg-elevated" />
          <div className="h-36 animate-pulse rounded-2xl bg-bg-elevated" />
          <div className="h-36 animate-pulse rounded-2xl bg-bg-elevated" />
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">Pages</h1>
          <p className="mt-1.5 font-body text-sm text-text-muted">
            Every generated page is a single unit with its own URL, submissions, and settings.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={() => router.push("/studio")}>
          New in Studio
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="font-body text-sm text-text-muted">No pages yet.</p>
          <p className="mt-1 font-body text-xs text-text-subtle">
            Start from Studio with a plain-English prompt.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/studio")}
          >
            Open Studio →
          </Button>
        </div>
      ) : (
        <WorkspacePageGrid pages={pages} />
      )}
    </div>
  );
}
