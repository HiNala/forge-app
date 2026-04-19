"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPage } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

function statusVariant(
  status: string,
): "live" | "draft" | "archived" {
  if (status === "live") return "live";
  if (status === "archived") return "archived";
  return "draft";
}

export default function PageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = typeof params.pageId === "string" ? params.pageId : "";
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();

  const q = useQuery({
    queryKey: ["page", activeOrganizationId, pageId],
    queryFn: () => getPage(getToken, activeOrganizationId, pageId),
    enabled: !!activeOrganizationId && !!pageId,
  });

  if (!activeOrganizationId) {
    return (
      <p className="text-sm text-text-muted font-body">
        Choose a workspace to view this page.
      </p>
    );
  }

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-12 w-full max-w-md rounded-md" />
        <Skeleton className="min-h-[200px] w-full rounded-[10px]" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-danger font-body" role="alert">
          {q.error instanceof Error
            ? q.error.message
            : "This page could not be found in your workspace."}
        </p>
        <Button type="button" variant="secondary" onClick={() => router.push("/pages")}>
          Back to pages
        </Button>
      </div>
    );
  }

  const p = q.data;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/pages"
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted font-body transition-colors hover:text-text"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Pages
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-text">
              {p.title}
            </h1>
            <p className="mt-2 font-mono text-sm text-text-muted">
              /{p.slug} · {p.page_type}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/studio")}
            >
              Open in Studio
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-0">
          <p className="max-w-prose text-sm leading-relaxed text-text-muted font-body">
            Summary and publish status will consolidate here (live URL, last published
            version, form schema). Backend hooks for publish and versions are still
            landing; the page record is real.
          </p>
        </TabsContent>
        <TabsContent value="submissions" className="mt-0">
          <p className="max-w-prose text-sm leading-relaxed text-text-muted font-body">
            Submissions table with inline expand, reply, and export ships with Mission
            04–05. Your data model and RLS are prepared on the API side.
          </p>
        </TabsContent>
        <TabsContent value="automations" className="mt-0">
          <p className="max-w-prose text-sm leading-relaxed text-text-muted font-body">
            Notify-on-submit, confirmation email, and calendar sync will be configured
            here per page once the automation engine is fully wired.
          </p>
        </TabsContent>
        <TabsContent value="analytics" className="mt-0">
          <p className="max-w-prose text-sm leading-relaxed text-text-muted font-body">
            Page-type-aware analytics (views, funnel, dwell) connect to ingested events
            — no placeholder charts until the metrics are real.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
