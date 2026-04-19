"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { PageHeader } from "@/components/chrome/page-header";
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

  const calendarList = calendars.data ?? [];
  const fallbackCalendarId = calendarList[0]?.id ?? null;
  const effectiveSelectedId = selectedId ?? fallbackCalendarId;
  const selected = calendarList.find((c) => c.id === effectiveSelectedId) ?? null;

  const debounceRef = React.useRef<number | null>(null);
  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      patchAvailabilityCalendar(getToken, activeOrganizationId, id, body),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["availability-calendars", activeOrganizationId] }),
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
      <PageHeader
        title="Calendars"
        description="Connect or import a calendar, set business hours, and Forge turns that into bookable slots on your live pages."
      />

      {!calendars.data?.length ? (
        <div className="rounded-[12px] border border-dashed border-border bg-surface/80 p-10 text-center">
          <p className="font-display text-lg text-text">Import a calendar to start offering appointment slots.</p>
          <p className="mt-2 text-sm text-text-muted font-body">
            Upload an .ics export from Google, Apple, or Outlook — then tune availability rules below.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
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
          <div className="mx-auto mt-4 max-w-md">
            <Label htmlFor="cal-name" className="sr-only">
              Calendar name
            </Label>
            <Input
              id="cal-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Calendar name"
            />
          </div>
        </div>
      ) : null}

      {preview && Object.keys(preview).length > 0 ? (
        <div className="rounded-[10px] border border-border bg-surface p-4 text-left text-sm font-body">
          <p className="font-medium text-text">ICS preview</p>
          <p className="mt-1 text-text-muted">
            Found {(preview as { event_count?: number }).event_count ?? "—"} expanded events ·{" "}
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
        </div>
      ) : null}

      {calendars.isLoading ? <p className="text-sm text-text-muted">Loading calendars…</p> : null}
      {calendars.data && calendars.data.length > 0 ? (
        <div className="space-y-8">
          <div className="flex flex-wrap gap-2">
            {calendars.data.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-body transition-colors ${
                  effectiveSelectedId === c.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-surface-muted text-text-muted hover:bg-bg-elevated"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {selected ? (
            <div className="space-y-6 rounded-[12px] border border-border bg-surface p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-xl text-text">{selected.name}</h2>
                  <p className="mt-1 text-xs text-text-muted font-body">
                    Source: {selected.source_type}
                    {selected.source_ref ? ` · ${selected.source_ref.slice(0, 48)}…` : ""}
                  </p>
                  <p className="mt-1 text-xs text-text-muted font-body">
                    Last sync: {selected.last_synced_at ?? "never"} · {formatSyncSummary(selected)}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                  live
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tz">Timezone</Label>
                  <Input
                    id="tz"
                    defaultValue={selected.timezone}
                    onBlur={(e) => queuePatch(selected.id, { timezone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="slot">Slot duration (minutes)</Label>
                  <Input
                    id="slot"
                    type="number"
                    min={15}
                    defaultValue={selected.slot_duration_minutes}
                    onBlur={(e) =>
                      queuePatch(selected.id, { slot_duration_minutes: Number(e.target.value) || 30 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="inc">Slot increment (minutes)</Label>
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
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Notice / advance</Label>
                    <p className="mt-1 text-xs text-text-muted">Min notice &amp; max advance edited below.</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="minn">Min notice (minutes)</Label>
                  <Input
                    id="minn"
                    type="number"
                    defaultValue={selected.min_notice_minutes}
                    onBlur={(e) =>
                      queuePatch(selected.id, { min_notice_minutes: Number(e.target.value) || 0 })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxd">Max advance (days)</Label>
                  <Input
                    id="maxd"
                    type="number"
                    defaultValue={selected.max_advance_days}
                    onBlur={(e) =>
                      queuePatch(selected.id, { max_advance_days: Number(e.target.value) || 60 })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Weekday hours (JSON)</Label>
                <p className="mt-1 text-xs text-text-muted font-body">
                  Keys are Python weekday: 0=Monday … 6=Sunday. Example:{" "}
                  <code className="rounded bg-bg-elevated px-1">{`{"0":[["09:00","17:00"]]}`}</code>
                </p>
                <textarea
                  key={selected.id}
                  className="mt-2 w-full min-h-[120px] rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs"
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

              <div>
                <Label>Re-upload ICS</Label>
                <Input
                  type="file"
                  accept=".ics,text/calendar"
                  className="mt-2 max-w-sm cursor-pointer"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    if (f) void onUploadToCalendar(selected.id, f);
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-medium text-text">Quick weekday template</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAYS.map((d, i) => (
                    <span
                      key={d}
                      className="rounded border border-border px-2 py-0.5 font-body text-xs text-text-muted"
                      title={`${i} = ${d}`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-text-muted font-body" aria-live="polite">
                {patchMut.isPending ? "Saving…" : patchMut.isSuccess ? "Saved" : null}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
