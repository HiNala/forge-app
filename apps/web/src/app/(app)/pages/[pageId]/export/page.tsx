"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { Download, Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportPageHtml, postDeckExport } from "@/lib/api";
import { usePageDetail } from "@/providers/page-detail-provider";
import { useForgeSession } from "@/providers/session-provider";

export default function PageExportTab() {
  const { page } = usePageDetail();
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function downloadHtml() {
    if (!activeOrganizationId) return;
    setBusy("html");
    try {
      const { blob, filename } = await exportPageHtml(getToken, activeOrganizationId, page.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started", { description: filename });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function exportDeck(fmt: "pdf" | "pptx") {
    if (!activeOrganizationId) return;
    setBusy(fmt);
    try {
      await postDeckExport(getToken, activeOrganizationId, page.id, fmt);
      toast.success("Export queued", {
        description: "You'll get a download link when the file is ready.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* HTML export — all page types */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="section-label mb-1">Download HTML</p>
        <p className="mb-3 font-body text-[12px] text-text-muted">
          Download your page as a self-contained HTML file. Open it in any browser or host it anywhere.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={busy === "html"}
          onClick={() => void downloadHtml()}
          className="gap-1.5"
        >
          {busy === "html" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          Download HTML
        </Button>
      </div>

      {/* Deck export — pitch decks only */}
      {page.page_type === "pitch_deck" ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="section-label mb-1">Export deck</p>
          <p className="mb-3 font-body text-[12px] text-text-muted">
            Generate a PDF or PPTX for sharing offline. Large exports run in the background — you&apos;ll get a download link when ready.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={busy === "pdf"}
              onClick={() => void exportDeck("pdf")}
            >
              PDF
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={busy === "pptx"}
              onClick={() => void exportDeck("pptx")}
            >
              PPTX
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
