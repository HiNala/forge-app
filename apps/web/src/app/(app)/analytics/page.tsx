import { Suspense } from "react";
import { LazyOrgAnalyticsView } from "@/components/analytics/analytics-views-lazy";

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-text-muted font-body">Loading analytics…</p>}
    >
      <LazyOrgAnalyticsView />
    </Suspense>
  );
}
