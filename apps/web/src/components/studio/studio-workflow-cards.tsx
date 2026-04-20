"use client";

import * as React from "react";
import {
  STUDIO_STARTER_CHIPS,
  type StudioStarterChip,
  resolveSurprisePrompt,
} from "@/lib/studio-content";
import {
  orderStudioStarterChips,
  type WorkflowUsageId,
} from "@/lib/studio-workflow-usage";
import { cn } from "@/lib/utils";

function isHighlighted(chipId: StudioStarterChip["id"], hw: WorkflowUsageId | null): boolean {
  if (!hw) return false;
  if (hw === "contact" && (chipId === "booking" || chipId === "contact" || chipId === "rsvp"))
    return true;
  if (hw === "proposal" && chipId === "proposal") return true;
  if (hw === "deck" && chipId === "menu") return true;
  return false;
}

export function StudioWorkflowCards({
  disabled,
  highlightId,
  onPrime,
}: {
  disabled?: boolean;
  highlightId: WorkflowUsageId | null;
  onPrime: (prime: string) => void;
}) {
  const ordered = React.useMemo(
    () => orderStudioStarterChips(STUDIO_STARTER_CHIPS.filter((c) => c.id !== "surprise")),
    [],
  );

  return (
    <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
      {ordered.map((c) => {
        const hi = isHighlighted(c.id, highlightId);
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              const prompt = c.id === "surprise" ? resolveSurprisePrompt() : c.prompt;
              onPrime(prompt);
            }}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left text-sm transition-colors font-body",
              "border-border bg-surface text-text shadow-sm hover:border-accent hover:text-accent",
              disabled && "pointer-events-none opacity-50",
              hi && "ring-2 ring-accent/40 ring-offset-2 ring-offset-bg",
            )}
          >
            <span className="block font-medium">{c.label}</span>
            <span className="mt-1 block text-xs text-text-muted line-clamp-2">{c.prompt || "Surprise me"}</span>
          </button>
        );
      })}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPrime(resolveSurprisePrompt())}
        className={cn(
          "rounded-2xl border border-dashed px-4 py-3 text-left text-sm transition-colors font-body sm:col-span-2",
          "border-border bg-bg-elevated/50 text-text-muted hover:border-accent hover:text-accent",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="font-medium">Surprise me</span>
        <span className="mt-1 block text-xs opacity-80">Random starter from the pool</span>
      </button>
    </div>
  );
}
