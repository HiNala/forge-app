"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getMe, listDesignMemory, patchUserPreferences, resetDesignMemory } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

export default function DesignMemorySettingsPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const qc = useQueryClient();

  const meQ = useQuery({
    queryKey: ["me", activeOrganizationId],
    queryFn: () => getMe(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const memQ = useQuery({
    queryKey: ["design-memory", activeOrganizationId],
    queryFn: () => listDesignMemory(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const applyMemory = Boolean(meQ.data?.preferences?.forge_apply_memory ?? true);

  const patchPref = useMutation({
    mutationFn: (body: Parameters<typeof patchUserPreferences>[1]) =>
      patchUserPreferences(getToken, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me", activeOrganizationId] });
      toast.success("Preferences saved");
    },
  });

  const resetM = useMutation({
    mutationFn: () => resetDesignMemory(getToken, activeOrganizationId),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["design-memory", activeOrganizationId] });
      toast.message("Memory cleared", { description: `Removed ${r.deleted} entries.` });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Design Memory</h1>
        <p className="mt-2 max-w-prose font-body text-sm leading-relaxed text-text-muted">
          These are things GlideDesign has learned about your preferences. They influence the designs GlideDesign generates for
          you. Edit anything that is not right; toggle off any preference to ignore it; or reset memory entirely to
          start fresh.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-body text-sm font-semibold text-text">Apply memory to new generations</p>
          <p className="mt-1 font-body text-xs text-text-muted">When off, feedback still saves but is not blended into prompts.</p>
        </div>
        <Switch
          checked={applyMemory}
          onCheckedChange={(v) =>
            patchPref.mutate({ forge_apply_memory: v })
          }
          aria-label="Apply memory to new generations"
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-base font-bold text-text">Saved preferences</h2>
        {memQ.isLoading ? (
          <p className="font-body text-sm text-text-muted">Loading…</p>
        ) : memQ.data && memQ.data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-bg-elevated/40 px-4 py-8 text-center font-body text-sm text-text-muted">
            GlideDesign will learn from your feedback as you use it. Come back here anytime to see and edit what has been remembered.
          </p>
        ) : (
          <ul className="space-y-2">
            {memQ.data?.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-medium text-text">
                    {row.kind} · {row.key}
                  </p>
                  <p className="font-mono text-[11px] text-text-muted">{JSON.stringify(row.value)}</p>
                  <p className="font-body text-[11px] text-text-subtle">
                    Strength {row.strength.toFixed(2)}
                    {row.updated_at ? ` · updated ${row.updated_at}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="border-t border-border pt-6">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={resetM.isPending}
          onClick={() => {
            if (window.confirm("Forget all design memory for this workspace user? This cannot be undone.")) {
              resetM.mutate();
            }
          }}
        >
          Forget everything
        </Button>
      </div>
    </div>
  );
}
