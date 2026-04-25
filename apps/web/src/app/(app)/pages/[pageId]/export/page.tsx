"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postDeckExport } from "@/lib/api";
import { usePageDetail } from "@/providers/page-detail-provider";
import { useForgeSession } from "@/providers/session-provider";

export default function PageExportTab() {
  const { page } = usePageDetail();
  const router = useRouter();
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const [busy, setBusy] = React.useState<string | null>(null);

  if (page.page_type !== "pitch_deck") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-muted font-body">
        Export is available for pitch deck pages.{" "}
        <button type="button" className="text-accent underline" onClick={() => router.push(`/pages/${page.id}/automations`)}>
          Open automations
        </button>{" "}
        for this page type.
      </div>
    );
  }

  async function run(fmt: "pdf" | "pptx") {
    if (!activeOrganizationId) return;
    setBusy(fmt);
    try {
      await postDeckExport(getToken, activeOrganizationId, page.id, fmt);
      toast.success("Export queued", {
        description: "You’ll get a download link when the file is ready (worker).",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <p className="section-label mb-1">Export deck</p>
        <p className="font-body text-[12px] text-text-muted">
          Generate a file for email or offline use. Large exports run in the background — you&apos;ll get a download link when ready.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="primary" size="sm" loading={busy === "pdf"} onClick={() => void run("pdf")}>
          PDF
        </Button>
        <Button type="button" variant="secondary" size="sm" loading={busy === "pptx"} onClick={() => void run("pptx")}>
          PPTX
        </Button>
      </div>
    </div>
  );
}
