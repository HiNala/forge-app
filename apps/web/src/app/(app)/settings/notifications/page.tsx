"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { PageHeader } from "@/components/chrome/page-header";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getMe, patchUserPreferences } from "@/lib/api";

function readBool(p: Record<string, unknown> | null | undefined, key: string, fallback: boolean): boolean {
  const v = p?.[key];
  return typeof v === "boolean" ? v : fallback;
}

export default function NotificationsSettingsPage() {
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(getToken, null),
  });

  const prefs = (me.data?.preferences ?? {}) as Record<string, unknown>;
  const digest = readBool(prefs, "notification_daily_automation_digest", true);
  const weekly = readBool(prefs, "notification_weekly_submissions", false);
  const product = readBool(prefs, "notification_product_updates", true);

  const [tick, setTick] = React.useState(false);
  const mut = useMutation({
    mutationFn: (patch: Record<string, boolean>) =>
      patchUserPreferences(getToken, patch as Parameters<typeof patchUserPreferences>[1]),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me"] });
      setTick(true);
      window.setTimeout(() => setTick(false), 2000);
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader title="Notifications" description="Email preferences persist to your Forge account." />

      {me.isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border bg-surface p-4">
            <div>
              <Label htmlFor="d1">Daily digest of failed automations</Label>
              <p className="mt-1 text-xs text-text-muted font-body">On by default.</p>
            </div>
            <Switch
              id="d1"
              checked={digest}
              onCheckedChange={(v) => mut.mutate({ notification_daily_automation_digest: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border bg-surface p-4">
            <div>
              <Label htmlFor="d2">Weekly submissions summary</Label>
              <p className="mt-1 text-xs text-text-muted font-body">Off by default.</p>
            </div>
            <Switch
              id="d2"
              checked={weekly}
              onCheckedChange={(v) => mut.mutate({ notification_weekly_submissions: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border bg-surface p-4">
            <div>
              <Label htmlFor="d3">Product updates from Forge</Label>
              <p className="mt-1 text-xs text-text-muted font-body">
                Occasional roadmap and quality-of-life notes. On by default.
              </p>
            </div>
            <Switch
              id="d3"
              checked={product}
              onCheckedChange={(v) => mut.mutate({ notification_product_updates: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border bg-bg-elevated/80 p-4 opacity-80">
            <div>
              <Label>Billing alerts</Label>
              <p className="mt-1 text-xs text-text-muted font-body">Required for payment failures — cannot be disabled.</p>
            </div>
            <Switch checked disabled aria-readonly />
          </div>

          <p className="text-xs text-text-muted font-body" aria-live="polite">
            {mut.isPending ? "Saving…" : tick ? "Saved" : null}
          </p>
        </div>
      )}
    </div>
  );
}
