"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePageDetail } from "@/providers/page-detail-provider";

/**
 * Deck workflow — export surface (W-04). Generation pipeline hooks land in a later release;
 * this tab is the home for PDF / PPTX / Google Slides once wired.
 */
export default function PageExportTab() {
  const { page } = usePageDetail();
  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-[10px] border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-text">Export</h2>
      <p className="text-sm text-text-muted font-body">
        Export formats for <span className="font-medium text-text">{page.title}</span> will appear
        here — PDF, PowerPoint, and Google Slides when your workspace is on a plan that includes
        deck exports.
      </p>
      <p className="text-xs text-text-subtle font-body">
        Until then, use Present mode from the live page and share the public link.
      </p>
      <Button type="button" variant="secondary" asChild>
        <Link href={`/pages/${page.id}`}>Back to overview</Link>
      </Button>
    </div>
  );
}
