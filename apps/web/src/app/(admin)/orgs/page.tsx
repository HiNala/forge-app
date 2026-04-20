"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { apiRequest } from "@/lib/api";

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  account_status: string;
  stripe_customer_id: string | null;
  member_count: number;
  created_at: string | null;
};

export default function AdminOrgsPage() {
  const { getToken } = useAuth();
  const [items, setItems] = React.useState<OrgRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    void apiRequest<{ items: OrgRow[] }>("/admin/organizations", {
      method: "GET",
      getToken,
      activeOrgId: null,
    })
      .then((r) => setItems(r.items))
      .catch(() => setErr("Could not load organizations."));
  }, [getToken]);

  if (err) {
    return <p className="text-sm text-danger font-body">{err}</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Organizations</h1>
      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white/70">
        <table className="w-full min-w-[640px] text-left text-sm font-body">
          <thead className="border-b border-black/10 bg-black/[0.03] text-[11px] uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Members</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b border-black/5">
                <td className="px-3 py-2">
                  <Link href={`/admin/orgs/${o.id}`} className="font-medium text-accent hover:underline">
                    {o.name}
                  </Link>
                  <div className="text-[11px] text-text-subtle">{o.slug}</div>
                </td>
                <td className="px-3 py-2">{o.plan}</td>
                <td className="px-3 py-2">{o.account_status}</td>
                <td className="px-3 py-2 tabular-nums">{o.member_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
