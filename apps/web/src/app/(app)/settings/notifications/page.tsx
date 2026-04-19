"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { Check, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getMe, patchUserPreferences } from "@/lib/api";
import { cn } from "@/lib/utils";

function readBool(p: Record<string, unknown> | null | undefined, key: string, fallback: boolean): boolean {
  const v = p?.[key];
  return typeof v === "boolean" ? v : fallback;
}

function NotificationRow({
  id,
  label,
  hint,
  checked,
  onChange,
  disabled,
  locked,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-6 py-5",
        disabled && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className={cn("font-body text-sm font-semibold", disabled && "cursor-default")}>
          {label}
        </Label>
        <p className="mt-1 font-body text-xs leading-relaxed text-text-subtle">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        {locked && <Lock className="size-3.5 text-text-subtle" aria-hidden />}
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled || locked}
          aria-readonly={locked}
        />
      </div>
    </div>
  );
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

  const [savedTick, setSavedTick] = React.useState(false);
  const mut = useMutation({
    mutationFn: (patch: Record<string, boolean>) =>
      patchUserPreferences(getToken, patch as Parameters<typeof patchUserPreferences>[1]),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me"] });
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 2500);
    },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Notifications</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          Email preferences — applied to your Forge account across all workspaces.
        </p>
      </div>

      {me.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-elevated" />
          ))}
        </div>
      ) : (
        <section className="divide-y divide-border rounded-2xl border border-border bg-surface px-6">
          <NotificationRow
            id="d1"
            label="Daily automation digest"
            hint="Summary of failed automations — sent each morning when there are failures."
            checked={digest}
            onChange={(v) => mut.mutate({ notification_daily_automation_digest: v })}
          />
          <NotificationRow
            id="d2"
            label="Weekly submissions summary"
            hint="A weekly recap of form submissions and page views across your workspace."
            checked={weekly}
            onChange={(v) => mut.mutate({ notification_weekly_submissions: v })}
          />
          <NotificationRow
            id="d3"
            label="Product updates"
            hint="Occasional roadmap notes, new features, and quality-of-life improvements."
            checked={product}
            onChange={(v) => mut.mutate({ notification_product_updates: v })}
          />
          <NotificationRow
            id="d4"
            label="Billing alerts"
            hint="Payment failures, quota warnings, and renewal reminders — required, cannot be disabled."
            checked
            locked
          />
        </section>
      )}

      <p className="font-body text-xs text-text-subtle" aria-live="polite">
        {mut.isPending ? "Saving…" : savedTick ? (
          <span className="inline-flex items-center gap-1 text-accent">
            <Check className="size-3.5" aria-hidden />
            Saved
          </span>
        ) : null}
      </p>
    </div>
  );
}
