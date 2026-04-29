"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { patchUserPreferences } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

export default function GenerationPreferencesPage() {
  const { getToken } = useAuth();
  const { me, refetchSession } = useForgeSession();
  const queryClient = useQueryClient();

  const p = me?.preferences as Record<string, unknown> | undefined;

  const mutate = useMutation({
    mutationFn: (body: Parameters<typeof patchUserPreferences>[1]) => patchUserPreferences(getToken, body),
    onSuccess: async () => {
      toast.success("Preferences saved");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await refetchSession();
    },
    onError: () => toast.error("Could not save preferences"),
  });

  const autoImprove = typeof p?.forge_auto_improve === "boolean" ? p.forge_auto_improve : true;
  const threshold =
    typeof p?.credit_confirm_threshold_cents === "number" ? p.credit_confirm_threshold_cents : 50;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Generation</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          Control confirmations, previews, and auto-improvement (BP-04).
        </p>
      </div>

      {!me ? (
        <div className="flex items-center gap-2 text-sm text-text-muted font-body">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <section className="space-y-6 rounded-2xl border border-border bg-surface p-6">
          <label className="flex items-start gap-3 font-body text-sm text-text">
            <input
              type="checkbox"
              checked={autoImprove}
              onChange={(e) => mutate.mutate({ forge_auto_improve: e.target.checked })}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Auto-improvement</span>
              <span className="mt-1 block text-text-muted">
                When quality review flags gaps, GlideDesign can run a targeted refinement (uses credits similarly to Studio refine).
              </span>
            </span>
          </label>

          <div>
            <p className="font-body text-sm font-semibold text-text">Pre-action confirmation threshold</p>
            <p className="mt-1 text-xs text-text-muted font-body">
              Confirmations appear when estimates would use a sizable share of session credits or clear this dollar-equivalent threshold.
            </p>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={threshold}
              disabled={mutate.isPending}
              onChange={(e) => mutate.mutate({ credit_confirm_threshold_cents: Number(e.target.value) })}
              className={cn("mt-3 w-full")}
            />
            <div className="mt-2 flex justify-between font-body text-xs text-text-muted">
              <span>$0.10</span>
              <span className="tabular-nums">${(threshold / 100).toFixed(2)}</span>
              <span>$5.00</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={mutate.isPending}
            onClick={() =>
              mutate.mutate({
                credit_estimate_display: "always",
                credit_post_action_toast: "big_only",
                studio_concurrency_behavior: "queue",
              })
            }
          >
            Reset communication defaults
          </Button>
        </section>
      )}
    </div>
  );
}
