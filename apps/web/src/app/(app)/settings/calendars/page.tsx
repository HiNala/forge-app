"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAvailabilityCalendar,
  listAvailabilityCalendars,
  patchAvailabilityCalendar,
  previewAvailabilityIcs,
  uploadAvailabilityCalendarIcs,
  type AvailabilityCalendarOut,
} from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function defaultWeekHours(): Record<string, string[][]> {
  const o: Record<string, string[][]> = {};
  for (let i = 0; i < 5; i++) {
    o[String(i)] = [["09:00", "17:00"]];
  }
  return o;
}

function formatSyncSummary(cal: AvailabilityCalendarOut): string {
  const s = cal.last_sync_summary;
  if (!s || typeof s !== "object") return "—";
  const busy = s.busy_block_count;
  const ms = s.duration_ms;
  if (typeof busy === "number" && typeof ms === "number") {
    return `${busy} busy blocks · ${ms}ms`;
  }
  return "Synced";
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[200px_1fr] sm:gap-6">
      <div className="pt-0.5">
        <p className="font-body text-sm font-semibold text-text">{label}</p>
        {hint ? <p className="mt-1 font-body text-xs leading-relaxed text-text-subtle">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function CalendarsSettingsPage() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const { activeOrganizationId } = useForgeSession();

  const calendars = useQuery({
    queryKey: ["availability-calendars"],
    queryFn: async () => {
      const { getMe } = await import("@/lib/api");
      const me = await getMe(getToken, null);
      const oid = me.active_organization_id;
      return listAvailabilityCalendars(getToken, oid);
    },
  });

  const createMut = useMutation({
    mutationFn: (name: string) =>
      createAvailabilityCalendar(getToken, activeOrganizationId, {
        name,
        source_type: "ics_file",
        timezone: "America/Los_Angeles",
      }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["availability-calendars", activeOrganizationId] }),
  });

  const [newName, setNewName] = React.useState("Work calendar");
  const [preview, setPreview] = React.useState<Record<string, unknown> | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [savedTick, setSavedTick] = React.useState(false);

  const calendarList = calendars.data ?? [];
  const fallbackCalendarId = calendarList[0]?.id ?? null;
  const effectiveSelectedId = selectedId ?? fallbackCalendarId;
  const selected = calendarList.find((c) => c.id === effectiveSelectedId) ?? null;

  const debounceRef = React.useRef<number | null>(null);
  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      patchAvailabilityCalendar(getToken, activeOrganizationId, id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["availability-calendars", activeOrganizationId] });
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 2500);
    },
  });

  const queuePatch = React.useCallback(
    (id: string, body: Record<string, unknown>) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        patchMut.mutate({ id, body });
      }, 500);
    },
    [patchMut],
  );

  const onFilePreview = async (f: File) => {
    if (!activeOrganizationId) return;
    const out = await previewAvailabilityIcs(getToken, activeOrganizationId, f);
    setPreview(out as unknown as Record<string, unknown>);
  };

  const onUploadToCalendar = async (calId: string, f: File) => {
    if (!activeOrganizationId) return;
    await uploadAvailabilityCalendarIcs(getToken, activeOrganizationId, calId, f);
    void qc.invalidateQueries({ queryKey: ["availability-calendars", activeOrganizationId] });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Calendars</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          Connect or import a calendar, set business hours, and Forge turns that into bookable slots on your live pages.
        </p>
      </div>

      {/* Empty state */}
      {!calendars.isLoading && !calendarList.length ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface/60 p-10 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-bg-elevated">
            <Upload className="size-5 text-text-muted" aria-hidden />
          </div>
          <p className="font-display text-lg font-bold text-text">
            Import a calendar to offer booking slots
          </p>
          <p className="mt-2 font-body text-sm font-light text-text-muted">
            Upload an .ics export from Google, Apple, or Outlook — then tune availability rules below.
          </p>
          <div className="mt-6 space-y-3">
            <div className="mx-auto max-w-xs">
              <Label htmlFor="cal-name" className="sr-only">Calendar name</Label>
              <Input
                id="cal-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Calendar name"
              />
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Input
                type="file"
                accept=".ics,text/calendar"
                className="max-w-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFilePreview(f);
                }}
              />
              <Button
                type="button"
                onClick={() => createMut.mutate(newName)}
                disabled={createMut.isPending}
                className="min-w-[8rem]"
              >
                Create calendar
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* ICS preview */}
      {preview && Object.keys(preview).length > 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className="font-display text-sm font-bold text-text">ICS preview</p>
          <p className="mt-1 font-body text-sm text-text-muted">
            {(preview as { event_count?: number }).event_count ?? "—"} expanded events ·{" "}
            {(preview as { busy_block_count?: number }).busy_block_count ?? "—"} busy blocks (
            {(preview as { duration_ms?: number }).duration_ms ?? "—"}ms)
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              const bh = (preview as { business_hours_suggested?: Record<string, unknown> })
                .business_hours_suggested;
              const id = selected?.id;
              if (id && bh) queuePatch(id, { business_hours: bh });
            }}
          >
            Apply suggested rules
          </Button>
        </section>
      ) : null}

      {calendars.isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-elevated" />
          ))}
        </div>
      ) : null}

      {calendarList.length > 0 ? (
        <div className="space-y-6">
          {/* Calendar selector */}
          {calendarList.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {calendarList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "rounded-full px-4 py-1.5 font-body text-sm font-medium transition-colors",
                    effectiveSelectedId === c.id
                      ? "bg-text text-bg"
                      : "bg-bg-elevated text-text-muted hover:text-text",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}

          {selected ? (
            <section className="rounded-2xl border border-border bg-surface p-6 space-y-6">
              {/* Calendar meta */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-text">{selected.name}</h2>
                  <p className="mt-1 font-body text-xs text-text-muted">
                    Source: {selected.source_type}
                    {selected.source_ref ? ` · ${selected.source_ref.slice(0, 48)}…` : ""}
                  </p>
                  <p className="mt-0.5 font-body text-xs text-text-subtle">
                    Last sync: {selected.last_synced_at ?? "never"} · {formatSyncSummary(selected)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 font-body text-[11px] font-semibold text-success">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden />
                  live
                </span>
              </div>

              <div className="border-t border-border" />

              {/* Timing settings */}
              <div className="space-y-5">
                <p className="section-label">Slot settings</p>
                <SettingRow label="Timezone">
                  <Input
                    id="tz"
                    defaultValue={selected.timezone}
                    onBlur={(e) => queuePatch(selected.id, { timezone: e.target.value })}
                  />
                </SettingRow>
                <SettingRow label="Slot duration" hint="Length of each bookable appointment (minutes)">
                  <Input
                    id="slot"
                    type="number"
                    min={15}
                    defaultValue={selected.slot_duration_minutes}
                    onBlur={(e) =>
                      queuePatch(selected.id, { slot_duration_minutes: Number(e.target.value) || 30 })
                    }
                    className="max-w-[120px]"
                  />
                </SettingRow>
                <SettingRow label="Slot increment" hint="How often slots start (e.g. every 15 min)">
                  <Input
                    id="inc"
                    type="number"
                    min={5}
                    defaultValue={selected.slot_increment_minutes}
                    onBlur={(e) =>
                      queuePatch(selected.id, {
                        slot_increment_minutes: Number(e.target.value) || 15,
                      })
                    }
                    className="max-w-[120px]"
                  />
                </SettingRow>
                <SettingRow label="Min notice" hint="Minimum lead time before a booking (minutes)">
                  <Input
                    id="minn"
                    type="number"
                    defaultValue={selected.min_notice_minutes}
                    onBlur={(e) =>
                      queuePatch(selected.id, { min_notice_minutes: Number(e.target.value) || 0 })
                    }
                    className="max-w-[120px]"
                  />
                </SettingRow>
                <SettingRow label="Max advance" hint="How far ahead bookings are allowed (days)">
                  <Input
                    id="maxd"
                    type="number"
                    defaultValue={selected.max_advance_days}
                    onBlur={(e) =>
                      queuePatch(selected.id, { max_advance_days: Number(e.target.value) || 60 })
                    }
                    className="max-w-[120px]"
                  />
                </SettingRow>
              </div>

              <div className="border-t border-border" />

              {/* Business hours */}
              <div className="space-y-3">
                <p className="section-label">Business hours</p>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d, i) => (
                    <span
                      key={d}
                      className="rounded-lg border border-border px-2.5 py-1 font-body text-xs text-text-muted"
                      title={`${i} = ${d}`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <p className="font-body text-xs text-text-subtle">
                  Keys are Python weekday: 0=Monday … 6=Sunday.{" "}
                  <code className="rounded bg-bg-elevated px-1">{`{"0":[["09:00","17:00"]]}`}</code>
                </p>
                <textarea
                  key={selected.id}
                  className="w-full min-h-[120px] rounded-xl border border-border bg-bg px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-text/20 focus:border-text/40"
                  defaultValue={JSON.stringify(
                    selected.business_hours && Object.keys(selected.business_hours).length
                      ? selected.business_hours
                      : defaultWeekHours(),
                    null,
                    2,
                  )}
                  onBlur={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
                      queuePatch(selected.id, { business_hours: parsed });
                    } catch {
                      /* ignore invalid JSON until fixed */
                    }
                  }}
                />
              </div>

              <div className="border-t border-border" />

              {/* Re-upload */}
              <div className="space-y-2">
                <p className="section-label">Re-upload ICS</p>
                <Input
                  type="file"
                  accept=".ics,text/calendar"
                  className="max-w-sm cursor-pointer"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    if (f) void onUploadToCalendar(selected.id, f);
                  }}
                />
              </div>

              {/* Save indicator */}
              <p className="font-body text-xs text-text-subtle" aria-live="polite">
                {patchMut.isPending ? "Saving…" : savedTick ? (
                  <span className="inline-flex items-center gap-1 text-accent">
                    <Check className="size-3.5" aria-hidden />
                    Saved
                  </span>
                ) : null}
              </p>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
