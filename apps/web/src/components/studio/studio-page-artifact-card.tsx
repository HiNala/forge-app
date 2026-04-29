"use client";

import { Copy, ExternalLink, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { ArtifactFeedbackStrip } from "@/components/feedback/artifact-feedback-strip";
import { StudioFourLayerPanel } from "@/components/studio/studio-four-layer-panel";
import { Button } from "@/components/ui/button";
import type { ForgeFourLayerPayload } from "@/lib/forge-four-layer";
import type { WorkflowBucket } from "@/components/feedback/artifact-feedback-strip";
import { cn } from "@/lib/utils";

export type ArtifactMeta = {
  pageId: string;
  title: string;
  pageType: string;
  slug: string;
  summary: string;
  status: string;
  qualityScore?: number;
  degradedQuality?: boolean;
  fourLayer?: ForgeFourLayerPayload | null;
  runId?: string | null;
};

function inferWorkflowBucket(meta: ArtifactMeta): WorkflowBucket {
  const pt = meta.pageType;
  if (pt.includes("pitch") || pt.includes("deck") || pt.includes("quiz") || pt.includes("survey")) {
    return "strategy";
  }
  if (pt.includes("proposal") || pt.includes("resume") || pt.includes("menu")) {
    return "copy";
  }
  return "ui";
}

type StudioPageArtifactCardProps = {
  meta: ArtifactMeta;
  orgSlug: string;
  getToken?: () => Promise<string | null>;
  activeOrgId?: string | null;
  onDraftRefinePrefill?: (text: string) => void;
  onOpen: () => void;
  onSaveExit: () => void;
  onCopyLink: () => void;
};

export function StudioPageArtifactCard({
  meta,
  orgSlug,
  getToken,
  activeOrgId,
  onDraftRefinePrefill,
  onOpen,
  onSaveExit,
  onCopyLink,
}: StudioPageArtifactCardProps) {
  const bucket = inferWorkflowBucket(meta);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className={cn(
        "max-w-[95%] rounded-xl border border-white/15 bg-white/[0.07] p-3 text-left shadow-sm",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <p className="font-display text-sm font-bold text-white">{meta.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-body text-[10px] font-semibold capitalize text-white/60">
          {meta.pageType.replace(/-/g, " ")}
        </span>
        {typeof meta.qualityScore === "number" ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-body text-[10px] font-semibold",
              (meta.qualityScore > 10 ? meta.qualityScore >= 90 : meta.qualityScore >= 8.5)
                ? "bg-emerald-500/20 text-emerald-300"
                : meta.qualityScore > 10
                  ? meta.qualityScore >= 75
                    ? "bg-amber-500/20 text-amber-200"
                    : meta.qualityScore >= 60
                      ? "bg-orange-500/20 text-orange-200"
                      : "bg-red-500/20 text-red-200"
                  : meta.qualityScore >= 7
                    ? "bg-amber-500/20 text-amber-200"
                    : "bg-red-500/20 text-red-200",
            )}
            title="Design review quality score"
          >
            Quality{" "}
            {meta.qualityScore > 10 ? Math.round(meta.qualityScore) : meta.qualityScore.toFixed(1)}
          </span>
        ) : null}
        <span className="text-xs text-white/60 font-body line-clamp-2">{meta.summary}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onOpen}>
          <ExternalLink className="size-3.5" />
          Open
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onSaveExit}>
          <LogOut className="size-3.5" />
          Save & exit
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onCopyLink}>
          <Copy className="size-3.5" />
          Copy link
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-white/40 font-body">
        Preview: /p/{orgSlug}/{meta.slug}
      </p>
      {meta.fourLayer ? <StudioFourLayerPanel payload={meta.fourLayer} compact /> : null}
      {getToken && activeOrgId ? (
        <ArtifactFeedbackStrip
          artifactKind="page"
          artifactRef={`page:${meta.pageId}`}
          runId={meta.runId ?? null}
          workflow={bucket}
          getToken={getToken}
          activeOrgId={activeOrgId}
          onCustomFeedback={onDraftRefinePrefill}
        />
      ) : null}
    </motion.div>
  );
}
