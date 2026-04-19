import { Suspense } from "react";
import { LazyPageAnalyticsView } from "@/components/analytics/analytics-views-lazy";

export default function PageAnalyticsRoute() {
  return (
    <Suspense
      fallback={<p className="text-sm text-text-muted font-body">Loading analytics…</p>}
    >
      <LazyPageAnalyticsView />
    </Suspense>
  );
}
