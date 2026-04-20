"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Code-splits Recharts — load only on analytics routes (Mission FE-07). */
export const LazyOrgAnalyticsView = dynamic(
  () =>
    import("@/components/analytics/org-analytics-view").then((m) => ({
      default: m.OrgAnalyticsView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-md" />
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    ),
  },
);

export const LazyPageAnalyticsView = dynamic(
  () =>
    import("@/components/analytics/page-analytics-view").then((m) => ({
      default: m.PageAnalyticsView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full max-w-md rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    ),
  },
);
