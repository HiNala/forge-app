"use client";

import { Copy, ExternalLink, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ArtifactMeta = {
  pageId: string;
  title: string;
  pageType: string;
  slug: string;
  summary: string;
  status: string;
};

type StudioPageArtifactCardProps = {
  meta: ArtifactMeta;
  orgSlug: string;
  onOpen: () => void;
  onSaveExit: () => void;
  onCopyLink: () => void;
};

export function StudioPageArtifactCard({
  meta,
  orgSlug,
  onOpen,
  onSaveExit,
  onCopyLink,
}: StudioPageArtifactCardProps) {
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
      <p className="font-display text-sm font-semibold text-white">{meta.title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70 font-body">
          {meta.pageType.replace("-", " ")}
        </span>
        <span className="text-xs text-white/60 font-body line-clamp-2">{meta.summary}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onOpen}>
          <ExternalLink className="size-3.5" />
          Open
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onSaveExit}>
          <LogOut className="size-3.5" />
          Save &amp; exit
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onCopyLink}>
          <Copy className="size-3.5" />
          Copy link
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-white/40 font-body">
        Preview: /p/{orgSlug}/{meta.slug}
      </p>
    </motion.div>
  );
}
