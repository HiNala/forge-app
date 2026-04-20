"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { getAdminOrganization, type AdminOrganizationDetail } from "@/lib/api";

export default function AdminOrgDetailPage() {
  const params = useParams();
  const orgId = typeof params.org_id === "string" ? params.org_id : "";
  const { getToken } = useAuth();
  const [data, setData] = React.useState<AdminOrganizationDetail | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orgId) return;
    void getAdminOrganization(getToken, orgId).then(setData).catch(() => setErr("Could not load organization."));
  }, [getToken, orgId]);

  if (err) {
    return <p className="text-sm text-danger">{err}</p>;
  }
  if (!data) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">{data.name}</h1>
      <p className="text-sm text-text-muted">
        {data.slug} · {data.plan} · {data.account_status}
      </p>
      <p className="text-sm">
        Members: <strong>{data.member_count}</strong>
      </p>
    </div>
  );
}
