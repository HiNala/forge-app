"use client";

import * as React from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FeedbackSubmitBody } from "@/lib/api";
import { postArtifactFeedback } from "@/lib/api";
import { cn } from "@/lib/utils";

export type WorkflowBucket = "ui" | "copy" | "code" | "strategy";

const NEG_UI = [
  "too_busy",
  "wrong_style",
  "wrong_density",
  "missing_feature",
  "wrong_layout",
  "accessibility_issue",
  "mobile_broken",
  "dark_mode_broken",
] as const;

const NEG_COPY = [
  "too_long",
  "too_corporate",
  "too_casual",
  "inaccurate",
  "off_brand",
  "repetitive",
] as const;

export type ArtifactFeedbackStripProps = {
  artifactKind: FeedbackSubmitBody["artifact_kind"];
  artifactRef?: string;
  runId?: string | null;
  workflow: WorkflowBucket;
  getToken: () => Promise<string | null>;
  activeOrgId: string | null;
  onCustomFeedback?: (text: string) => void;
  className?: string;
};

export function ArtifactFeedbackStrip({
  artifactKind,
  artifactRef = "main",
  runId,
  workflow,
  getToken,
  activeOrgId,
  onCustomFeedback,
  className,
}: ArtifactFeedbackStripProps) {
  const [ack, setAck] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [negOpen, setNegOpen] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(() => new Set());

  async function submit(payload: Omit<FeedbackSubmitBody, "run_id" | "artifact_kind" | "artifact_ref">) {
    if (!runId) return;
    setBusy(true);
    try {
      await postArtifactFeedback(getToken, activeOrgId, {
        run_id: runId,
        artifact_kind: artifactKind,
        artifact_ref: artifactRef,
        ...payload,
      });
    } finally {
      setBusy(false);
    }
  }

  const negPool = workflow === "ui" ? NEG_UI : workflow === "copy" ? NEG_COPY : NEG_UI;

  const improveUi = (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({ sentiment: "improvement_request", structured_reasons: [], action_taken: "less_busy" });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        🎨 Less busy
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({ sentiment: "improvement_request", structured_reasons: [], action_taken: "more_premium" });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        🚀 More premium
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({ sentiment: "improvement_request", structured_reasons: [], action_taken: "simpler" });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        ⚡ Simpler
      </Button>
    </>
  );

  const improveCopy = (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({ sentiment: "improvement_request", structured_reasons: [], action_taken: "shorter_copy" });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        ✂️ Shorter
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({
            sentiment: "improvement_request",
            structured_reasons: [],
            action_taken: "stronger_copy",
          });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        🔥 Stronger
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({
            sentiment: "improvement_request",
            structured_reasons: [],
            action_taken: "more_specific_copy",
          });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        🎯 More specific
      </Button>
    </>
  );

  const improveCode = (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({ sentiment: "improvement_request", structured_reasons: [], action_taken: "more_comments" });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        📚 Comments
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({ sentiment: "improvement_request", structured_reasons: [], action_taken: "more_modular" });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        🧱 Modular
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy || !runId}
        className="h-7 px-2 text-[10px]"
        onClick={async () => {
          await submit({ sentiment: "improvement_request", structured_reasons: [], action_taken: "stricter_types" });
          setAck("✓ Noted");
          window.setTimeout(() => setAck(null), 1400);
        }}
      >
        🎯 Types
      </Button>
    </>
  );

  return (
    <div className={cn("relative mt-3", className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || !runId}
          className="h-8 gap-1 px-2 text-[11px] text-white"
          aria-label="Good"
          onClick={async () => {
            await submit({ sentiment: "positive", structured_reasons: [], action_taken: "thumbs_up" });
            setAck("✓ Noted");
            window.setTimeout(() => setAck(null), 1600);
          }}
        >
          <ThumbsUp className="size-3.5 text-emerald-200" />
          Good
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || !runId}
          className="h-8 gap-1 px-2 text-[11px] text-white/90"
          onClick={() => setNegOpen((o) => !o)}
        >
          <ThumbsDown className="size-3.5" />
          Not right
        </Button>
        {workflow === "ui" || workflow === "strategy"
          ? improveUi
          : workflow === "copy"
            ? improveCopy
            : workflow === "code"
              ? improveCode
              : improveUi}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[10px]"
          disabled={!onCustomFeedback}
          onClick={() => onCustomFeedback?.("Improve this artifact: ")}
        >
          Custom feedback
        </Button>
        {ack ? <span className="text-[10px] text-emerald-300">{ack}</span> : null}
      </div>
      {negOpen ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-white">
          <p className="mb-2 font-medium text-white/80">What stood out?</p>
          <div className="flex flex-wrap gap-1">
            {negPool.map((k) => (
              <button
                key={k}
                type="button"
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px]",
                  picked.has(k)
                    ? "border-emerald-400/70 bg-emerald-500/20"
                    : "border-white/15 bg-white/5 hover:bg-white/10",
                )}
                onClick={() =>
                  setPicked((prev) => {
                    const n = new Set(prev);
                    if (n.has(k)) n.delete(k);
                    else n.add(k);
                    return n;
                  })
                }
              >
                {k.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="primary"
            className="mt-3 w-full"
            disabled={busy}
            onClick={async () => {
              await submit({
                sentiment: "negative",
                structured_reasons: Array.from(picked),
                action_taken: "thumbs_down",
              });
              setNegOpen(false);
              setAck("✓ Saved");
              window.setTimeout(() => setAck(null), 1400);
            }}
          >
            Send feedback
          </Button>
        </div>
      ) : null}
    </div>
  );
}
