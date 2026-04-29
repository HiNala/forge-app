"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Shield } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { listAdminUsers, type AdminUserListItem } from "@/lib/api";

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const [q, setQ] = React.useState("");

  const usersQ = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => listAdminUsers(getToken, q || undefined),
    staleTime: 30_000,
  });

  const items: AdminUserListItem[] = usersQ.data?.items ?? [];
  const loading = usersQ.isLoading;
  const err = usersQ.isError ? "Unable to load users." : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="mt-0.5 font-body text-sm text-text-muted">
            All platform users — {items.length} shown
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            className="w-60 pl-8"
            placeholder="Search email or name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {err ? (
        <p className="font-body text-sm text-danger">{err}</p>
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-bg-elevated" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-sm font-body">
            <thead className="border-b border-border bg-bg-elevated text-[11px] uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-bg-elevated/50">
                  <td className="px-4 py-3 font-medium text-text">{u.email}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {u.display_name ?? <span className="text-text-subtle">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">
                        <Shield className="size-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-text-muted">Member</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
