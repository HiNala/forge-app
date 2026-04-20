"use client";

import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  adminListTemplates,
  adminRegenerateTemplatePreview,
  type AdminTemplateRow,
} from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

function parseOperatorOrgIds(): string[] {
  const raw = process.env.NEXT_PUBLIC_FORGE_OPERATOR_ORG_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminTemplatesPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const [rows, setRows] = React.useState<AdminTemplateRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const operatorIds = React.useMemo(() => parseOperatorOrgIds(), []);
  const isOperator =
    !!activeOrganizationId && operatorIds.includes(activeOrganizationId);

  const load = React.useCallback(async () => {
    if (!activeOrganizationId || !isOperator) return;
    setLoading(true);
    try {
      const data = await adminListTemplates(getToken, activeOrganizationId);
      setRows(data);
    } catch {
      toast.error("Could not load admin templates.");
    } finally {
      setLoading(false);
    }
  }, [getToken, activeOrganizationId, isOperator]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void load();
  }, [load]);

  async function onRegenerate(id: string) {
    if (!activeOrganizationId) return;
    setBusy(id);
    try {
      await adminRegenerateTemplatePreview(getToken, activeOrganizationId, id);
      toast.success("Preview job queued.");
      await load();
    } catch {
      toast.error("Could not queue preview.");
    } finally {
      setBusy(null);
    }
  }

  if (!isOperator) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-text">Templates admin</h1>
        <p className="mt-3 text-sm text-text-muted">
          This view is only available when your active workspace is listed in{" "}
          <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_FORGE_OPERATOR_ORG_IDS</code>{" "}
          and matches the API&apos;s{" "}
          <code className="rounded bg-surface-muted px-1">FORGE_OPERATOR_ORG_IDS</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-text">Curate templates</h1>
      <p className="mt-2 text-sm text-text-muted">
        Create and edit rows via API or seed scripts; queue screenshot regeneration here.
      </p>
      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-2xl border border-border">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-text">{r.name}</div>
                <div className="text-xs text-text-muted">
                  {r.slug} · {r.category}{" "}
                  {r.is_published ? (
                    <span className="text-emerald-600">published</span>
                  ) : (
                    <span className="text-amber-700">draft</span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy === r.id}
                onClick={() => void onRegenerate(r.id)}
              >
                {busy === r.id ? "Queueing…" : "Regenerate preview"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
