"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { PageHeader } from "@/components/chrome/page-header";
import { listPages } from "@/lib/api";
import { getWorkflowFamily } from "@/lib/workflow-config";
import { useForgeSession } from "@/providers/session-provider";

/** Deck-heavy orgs — engagement rollup (W-04 shell). */
export default function AnalyticsEngagementPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();

  const pagesQ = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const deckCount =
    pagesQ.data?.filter((p) => getWorkflowFamily(p.page_type) === "deck").length ?? 0;

  if (!activeOrganizationId) {
    return <p className="text-sm text-text-muted font-body">Choose a workspace.</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Deck engagement"
        description="Time on deck, exports, and presenter sessions — detailed metrics land on top of analytics events next."
      />
      {deckCount === 0 ? (
        <p className="text-sm text-text-muted font-body">
          No pitch deck pages in this workspace yet — generate one in Studio to track reads here.
        </p>
      ) : (
        <p className="text-sm text-text-muted font-body">
          {deckCount} deck page{deckCount === 1 ? "" : "s"} detected — per-viewer timing and presenter
          sessions will aggregate here as events mature.
        </p>
      )}
      <Link href="/analytics" className="text-sm text-accent underline-offset-4 hover:underline font-body">
        ← Org analytics
      </Link>
    </div>
  );
}
