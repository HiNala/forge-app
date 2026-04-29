"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getMe, patchUserPreferences } from "@/lib/api";
import Link from "next/link";
import { useForgeSession } from "@/providers/session-provider";

export default function SettingsStudioExperiencePage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const qc = useQueryClient();

  const meQ = useQuery({
    queryKey: ["me", activeOrganizationId],
    queryFn: () => getMe(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const prefs = (meQ.data?.preferences ?? {}) as Record<string, unknown>;
  const warRoom = prefs.studio_war_room_layout === true;

  const mut = useMutation({
    mutationFn: (studio_war_room_layout: boolean) =>
      patchUserPreferences(getToken, { studio_war_room_layout }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me", activeOrganizationId] });
      toast.success("Saved");
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Studio experience</h1>
        <p className="mt-2 max-w-prose font-body text-sm leading-relaxed text-text-muted">
          GlideDesign can open the Product War Room — four panes, stages, next move, actions — instead of legacy
          Studio.
        </p>
      </div>
      <section className="space-y-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-body text-sm font-semibold text-text">Product War Room layout</p>
            <p className="mt-1 max-w-xl font-body text-xs text-text-muted">
              Command-center framing for Strategy · Canvas · System. You can revert to Claude-style Studio any time —
              GlideDesign keeps parity while this surface hardens.
            </p>
            <Link href="/studio?legacy=1" className="mt-2 inline-block text-[12px] font-semibold text-accent hover:underline">
              Open legacy Studio explicitly
            </Link>
          </div>
          <Switch
            checked={warRoom}
            onCheckedChange={(v) => mut.mutate(v)}
            aria-label="Enable Product War Room layout"
          />
        </div>
      </section>
    </div>
  );
}
