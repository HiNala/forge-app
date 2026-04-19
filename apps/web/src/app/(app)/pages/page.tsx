"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/chrome/page-header";
import { WorkspacePageGrid } from "@/components/pages/workspace-page-grid";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
      <p className="text-sm text-text-muted font-body">
        Choose a workspace to see your pages.
      </p>
    );
  }

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 max-w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-36 rounded-[10px]" />
          <Skeleton className="h-36 rounded-[10px]" />
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

  const pages = q.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pages"
        description="Every generated page is a single unit with its own URL, submissions, and settings."
        actions={
          <Button type="button" variant="primary" onClick={() => router.push("/studio")}>
            New in Studio
          </Button>
        }
      />
      {pages.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-text-muted font-body">
          No pages yet. Start from Studio with a plain-English prompt.
        </p>
      ) : (
        <WorkspacePageGrid pages={pages} />
      )}
    </div>
  );
}
