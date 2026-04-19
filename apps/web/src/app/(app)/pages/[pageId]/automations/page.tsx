"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getAutomationRuns,
  getPageAutomations,
  listCalendarConnections,
  postGoogleCalendarConnect,
  putPageAutomations,
  type AutomationRuleOut,
  type AutomationRunOut,
  type CalendarConnectionOut,
} from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

function emailsToText(emails: string[]) {
  return emails.join("\n");
}

function textToEmails(text: string) {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PageAutomationsPage() {
  const params = useParams();
  const pageId = typeof params.pageId === "string" ? params.pageId : "";
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();

  const qRule = useQuery({
    queryKey: ["automations", activeOrganizationId, pageId],
    queryFn: () => getPageAutomations(getToken, activeOrganizationId, pageId),
    enabled: !!activeOrganizationId && !!pageId,
  });

  if (!activeOrganizationId) {
    return (
      <p className="text-sm text-text-muted font-body">Choose a workspace to configure automations.</p>
    );
  }

  if (qRule.isLoading || !qRule.data) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading automations…
      </div>
    );
  }

  if (qRule.isError) {
    return <p className="text-sm text-danger">Could not load automations.</p>;
  }

  return (
    <AutomationsEditor
      key={`${pageId}-${qRule.dataUpdatedAt}`}
      pageId={pageId}
      initial={qRule.data}
      getToken={getToken}
      activeOrganizationId={activeOrganizationId}
    />
  );
}

function AutomationsEditor({
  pageId,
  initial,
  getToken,
  activeOrganizationId,
}: {
  pageId: string;
  initial: AutomationRuleOut;
  getToken: () => Promise<string | null>;
  activeOrganizationId: string;
}) {
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected") === "1";
  const qc = useQueryClient();

  const qRuns = useQuery({
    queryKey: ["automation-runs", activeOrganizationId, pageId],
    queryFn: () => getAutomationRuns(getToken, activeOrganizationId, pageId),
    enabled: !!activeOrganizationId && !!pageId,
  });

  const qCal = useQuery({
    queryKey: ["calendar-connections", activeOrganizationId],
    queryFn: () => listCalendarConnections(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const [draft, setDraft] = useState<AutomationRuleOut>(initial);
  const [notifyText, setNotifyText] = useState(emailsToText(initial.notify_emails));
  const [dirty, setDirty] = useState(false);

  const saveMut = useMutation({
    mutationFn: async (body: Partial<AutomationRuleOut>) => {
      return putPageAutomations(getToken, activeOrganizationId, pageId, body);
    },
    onSuccess: (data) => {
      setDraft(data);
      qc.setQueryData(["automations", activeOrganizationId, pageId], data);
      setDirty(false);
    },
  });

  useEffect(() => {
    if (!dirty || !draft) return;
    const t = window.setTimeout(() => {
      saveMut.mutate({
        notify_emails: textToEmails(notifyText),
        confirm_submitter: draft.confirm_submitter,
        confirm_template_subject: draft.confirm_template_subject,
        confirm_template_body: draft.confirm_template_body,
        calendar_sync_enabled: draft.calendar_sync_enabled,
        calendar_connection_id: draft.calendar_connection_id,
        calendar_event_duration_min: draft.calendar_event_duration_min,
        calendar_send_invite: draft.calendar_send_invite,
      });
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce save for whole form
  }, [dirty, draft, notifyText]);

  const markDirty = useCallback(() => setDirty(true), []);

  const onConnectGoogle = async () => {
    const r = await postGoogleCalendarConnect(getToken, activeOrganizationId, pageId);
    window.location.href = r.authorize_url;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {connected ? (
        <p className="rounded-lg border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-text">
          Google Calendar connected. Pick this calendar below if you want events on submissions.
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-text">Notify on submission</h2>
          <p className="mt-1 text-sm text-text-muted">
            One email per line — we&apos;ll email owners when a form is submitted.
          </p>
        </div>
        <Textarea
          value={notifyText}
          onChange={(e) => {
            setNotifyText(e.target.value);
            markDirty();
          }}
          rows={4}
          className="font-mono text-sm"
          placeholder={"you@studio.com\ncoach@studio.com"}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-text">Confirmation email</h2>
            <p className="mt-1 text-sm text-text-muted">Send a branded thank-you to the submitter.</p>
          </div>
          <Switch
            checked={draft.confirm_submitter}
            onCheckedChange={(v) => {
              setDraft((d) => ({ ...d, confirm_submitter: v }));
              markDirty();
            }}
          />
        </div>
        {draft.confirm_submitter ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="conf-subj">Subject</Label>
              <Input
                id="conf-subj"
                value={draft.confirm_template_subject ?? ""}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, confirm_template_subject: e.target.value }));
                  markDirty();
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="conf-body">Body</Label>
              <Textarea
                id="conf-body"
                rows={5}
                value={draft.confirm_template_body ?? ""}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, confirm_template_body: e.target.value }));
                  markDirty();
                }}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-text">Google Calendar</h2>
            <p className="mt-1 text-sm text-text-muted">
              Create a hold when a submission arrives (optional).
            </p>
          </div>
          <Switch
            checked={draft.calendar_sync_enabled}
            onCheckedChange={(v) => {
              setDraft((d) => ({ ...d, calendar_sync_enabled: v }));
              markDirty();
            }}
          />
        </div>
        {draft.calendar_sync_enabled ? (
          <div className="space-y-4 rounded-lg border border-border-subtle p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void onConnectGoogle()}>
                Connect Google Calendar
              </Button>
              <Link href="/settings" className="text-sm text-text-muted underline-offset-4 hover:underline">
                Manage connections
              </Link>
            </div>
            <ConnectionPicker
              connections={qCal.data ?? []}
              value={draft.calendar_connection_id}
              onChange={(id) => {
                setDraft((d) => ({ ...d, calendar_connection_id: id }));
                markDirty();
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Event duration (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  max={1440}
                  value={draft.calendar_event_duration_min}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setDraft((d) => ({
                      ...d,
                      calendar_event_duration_min: Number.isFinite(n) ? n : d.calendar_event_duration_min,
                    }));
                    markDirty();
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-6">
                <Label htmlFor="inv">Invite submitter</Label>
                <Switch
                  id="inv"
                  checked={draft.calendar_send_invite}
                  onCheckedChange={(v) => {
                    setDraft((d) => ({ ...d, calendar_send_invite: v }));
                    markDirty();
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-text">Recent runs</h2>
        <RunsList runs={qRuns.data ?? []} loading={qRuns.isLoading} />
      </section>

      <p className="text-xs text-text-muted">
        Changes save automatically.{" "}
        {saveMut.isPending ? <span className="text-text">Saving…</span> : dirty ? <span>Pending…</span> : null}
      </p>
    </div>
  );
}

function ConnectionPicker({
  connections,
  value,
  onChange,
}: {
  connections: CalendarConnectionOut[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  if (connections.length === 0) {
    return (
      <p className="text-sm text-text-muted">No calendar connected yet — use Connect Google Calendar above.</p>
    );
  }
  return (
    <div className="space-y-1">
      <Label htmlFor="cal-conn">Calendar connection</Label>
      <select
        id="cal-conn"
        className="flex h-10 w-full rounded-md border border-border-subtle bg-surface px-3 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      >
        <option value="">— Select —</option>
        {connections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.provider} · {c.calendar_name ?? c.calendar_id}
            {c.last_error ? " (error)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function RunsList({ runs, loading }: { runs: AutomationRunOut[]; loading: boolean }) {
  if (loading) {
    return <p className="text-sm text-text-muted">Loading runs…</p>;
  }
  if (runs.length === 0) {
    return <p className="text-sm text-text-muted">No automation runs yet for this page.</p>;
  }
  return (
    <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
      {runs.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm">
          <div>
            <span className="font-mono text-xs text-text-muted">{r.step}</span>
            <span
              className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs ${
                r.status === "success"
                  ? "bg-emerald-500/15 text-emerald-800"
                  : r.status === "skipped"
                    ? "bg-zinc-500/15 text-zinc-700"
                    : "bg-rose-500/15 text-rose-800"
              }`}
            >
              {r.status}
            </span>
            <p className="mt-1 text-xs text-text-muted">{new Date(r.ran_at).toLocaleString()}</p>
            {r.error_message ? (
              <p className="mt-1 text-xs text-danger" role="alert">
                {r.error_message}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
