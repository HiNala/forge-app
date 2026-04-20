"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { listAdminOrganizations, type AdminOrganizationListItem } from "@/lib/api";

export default function AdminOrgsPage() {
  const { getToken } = useAuth();
  const [items, setItems] = React.useState<AdminOrganizationListItem[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    void listAdminOrganizations(getToken)
      .then((r) => setItems(r.items))
      .catch(() => setErr("Unable to load organizations."));
  }, [getToken]);

  if (err) {
    return <p className="font-body text-sm text-danger">{err}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Organizations</h1>
        <p className="mt-1 text-sm text-text-muted font-body">Platform directory — open a row for detail.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm font-body">
          <thead className="border-b border-border bg-bg-elevated text-[11px] uppercase text-text-muted">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Status</th>
              <th className="p-3">Members</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <Link href={`/admin/orgs/${o.id}`} className="font-medium text-accent underline-offset-4 hover:underline">
                    {o.name}
                  </Link>
                </td>
                <td className="p-3 text-text-muted">{o.slug}</td>
                <td className="p-3">{o.plan}</td>
                <td className="p-3">{o.account_status}</td>
                <td className="p-3 tabular-nums">{o.member_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
