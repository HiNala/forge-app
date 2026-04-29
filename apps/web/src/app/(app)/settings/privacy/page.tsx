"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getMe, patchUserPreferences } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

export default function SettingsPrivacyPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const qc = useQueryClient();
  const meQ = useQuery({
    queryKey: ["me", activeOrganizationId],
    queryFn: () => getMe(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });
  const prefs = (meQ.data?.preferences ?? {}) as Record<string, unknown>;
  const shareAcross = Boolean(prefs.forge_memory_share_across_orgs ?? false);
  const contribute = prefs.forge_contribute_feedback_to_platform !== false;

  const mut = useMutation({
    mutationFn: (body: Parameters<typeof patchUserPreferences>[1]) =>
      patchUserPreferences(getToken, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me", activeOrganizationId] });
      toast.success("Saved");
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Privacy</h1>
        <p className="mt-2 max-w-prose font-body text-sm leading-relaxed text-text-muted">
          Control how GlideDesign uses what it learns about you and whether anonymized signals help improve the platform.
        </p>
      </div>
      <section className="space-y-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-body text-sm font-semibold text-text">Design Memory</p>
            <p className="mt-1 font-body text-xs text-text-muted">
              Master switches also live under Settings → Memory. This section covers cross-workspace telemetry.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-body text-sm font-semibold text-text">Use memory across organizations</p>
            <p className="mt-1 max-w-xl font-body text-xs text-text-muted">
              Off by default. When on, GlideDesign may apply the same stylistic fingerprint when you hop between workspaces
              you belong to.
            </p>
          </div>
          <Switch checked={shareAcross} onCheckedChange={(v) => mut.mutate({ forge_memory_share_across_orgs: v })} />
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-body text-sm font-semibold text-text">Help improve GlideDesign for everyone</p>
            <p className="mt-1 max-w-xl font-body text-xs text-text-muted">
              When enabled, thumbs and refine summaries can appear in aggregated founder analytics. Your personal memory
              still updates either way.
            </p>
          </div>
          <Switch
            checked={contribute}
            onCheckedChange={(v) => mut.mutate({ forge_contribute_feedback_to_platform: v })}
          />
        </div>
      </section>
    </div>
  );
}
