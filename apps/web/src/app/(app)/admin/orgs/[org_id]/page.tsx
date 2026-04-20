"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { getAdminOrganization, type AdminOrganizationDetail } from "@/lib/api";

export default function AdminOrganizationDetailPage() {
  const { org_id: orgId } = useParams<{ org_id: string }>();
  const { getToken } = useAuth();
  const [data, setData] = React.useState<AdminOrganizationDetail | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orgId) return;
    void getAdminOrganization(getToken, orgId)
      .then(setData)
      .catch(() => setErr("Unable to load organization."));
  }, [getToken, orgId]);

  if (err) {
    return (
      <div className="space-y-3">
        <p className="font-body text-sm text-danger">{err}</p>
        <Link href="/admin/orgs" className="text-sm text-accent underline-offset-4 hover:underline">
          ← Back to organizations
        </Link>
      </div>
    );
  }
  if (!data) {
    return <p className="font-body text-sm text-text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orgs" className="font-body text-xs text-accent underline-offset-4 hover:underline">
          ← Organizations
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{data.name}</h1>
        <p className="mt-1 text-sm text-text-muted font-body">
          {data.slug} · {data.plan} · {data.account_status}
        </p>
      </div>
      <dl className="grid gap-3 rounded-2xl border border-border bg-surface p-4 text-sm font-body sm:grid-cols-2">
        <div>
          <dt className="section-label">Members</dt>
          <dd className="mt-1 tabular-nums font-medium">{data.member_count}</dd>
        </div>
        <div>
          <dt className="section-label">Created</dt>
          <dd className="mt-1 text-text-muted">{data.created_at ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="section-label">Stripe customer</dt>
          <dd className="mt-1 break-all font-mono text-xs text-text-muted">
            {data.stripe_customer_id ?? "—"}
          </dd>
        </div>
        {data.stripe_subscription_id ? (
          <div className="sm:col-span-2">
            <dt className="section-label">Stripe subscription</dt>
            <dd className="mt-1 break-all font-mono text-xs text-text-muted">{data.stripe_subscription_id}</dd>
          </div>
        ) : null}
      </dl>
      {Object.keys(data.org_settings ?? {}).length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="section-label mb-2">Org settings (raw)</p>
          <pre className="max-h-64 overflow-auto rounded-md bg-bg-elevated p-3 text-xs text-text-muted">
            {JSON.stringify(data.org_settings, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
