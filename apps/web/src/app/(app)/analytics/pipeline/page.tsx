"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { PageHeader } from "@/components/chrome/page-header";
import { listPages } from "@/lib/api";
import { getWorkflowFamily } from "@/lib/workflow-config";
import { useForgeSession } from "@/providers/session-provider";

/** Proposal-heavy orgs — Kanban-style pipeline (W-04 shell). */
export default function AnalyticsPipelinePage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();

  const pagesQ = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const proposalCount =
    pagesQ.data?.filter((p) => getWorkflowFamily(p.page_type) === "proposal").length ?? 0;

  if (!activeOrganizationId) {
    return <p className="text-sm text-text-muted font-body">Choose a workspace.</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Proposal pipeline"
        description="Track proposals from draft to decision — richer CRM-style data rolls up here next."
      />
      {proposalCount === 0 ? (
        <p className="text-sm text-text-muted font-body">
          Create proposal pages in Studio to populate this view — nothing to show yet.
        </p>
      ) : (
        <p className="text-sm text-text-muted font-body">
          You have {proposalCount} proposal page{proposalCount === 1 ? "" : "s"}. Open each
          page&apos;s Submissions tab for status today — Kanban columns will map to proposal state in a
          follow-up release.
        </p>
      )}
      <Link href="/analytics" className="text-sm text-accent underline-offset-4 hover:underline font-body">
        ← Org analytics
      </Link>
    </div>
  );
}
