"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteTeamMember,
  getTeamMembers,
  patchTeamMember,
  postTeamInvite,
  type MemberOut,
} from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLES = ["owner", "editor", "viewer"] as const;

function roleBadgeClass(role: string): string {
  switch (role) {
    case "owner":
      return "border-accent/30 bg-accent-light text-accent";
    case "editor":
      return "border-border bg-bg-elevated text-text";
    default:
      return "border-border bg-surface text-text-muted";
  }
}

export default function TeamSettingsPage() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const { activeOrganizationId, user, activeRole } = useForgeSession();
  const isOwner = activeRole === "owner";

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<(typeof ROLES)[number]>("editor");

  const members = useQuery({
    queryKey: ["team-members", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getTeamMembers(getToken, activeOrganizationId),
  });

  const inviteMut = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) throw new Error("No workspace");
      return postTeamInvite(getToken, activeOrganizationId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
    },
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteEmail("");
      void qc.invalidateQueries({ queryKey: ["team-members", activeOrganizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMut = useMutation({
    mutationFn: async (p: { member: MemberOut; role: (typeof ROLES)[number] }) => {
      if (!activeOrganizationId) throw new Error("No workspace");
      return patchTeamMember(getToken, activeOrganizationId, p.member.id, { role: p.role });
    },
    onSuccess: () => {
      toast.success("Role updated");
      void qc.invalidateQueries({ queryKey: ["team-members", activeOrganizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: async (memberId: string) => {
      if (!activeOrganizationId) throw new Error("No workspace");
      return deleteTeamMember(getToken, activeOrganizationId, memberId);
    },
    onSuccess: () => {
      toast.success("Member removed");
      void qc.invalidateQueries({ queryKey: ["team-members", activeOrganizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = members.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">Team</h1>
        <p className="mt-2 text-text-muted font-body">
          People in this workspace. Only owners can invite or change roles.
        </p>
      </div>

      {isOwner ? (
        <section className="rounded-[10px] border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-text">Invite someone</h2>
          <form
            className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              inviteMut.mutate();
            }}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="w-full space-y-2 sm:w-40">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as (typeof ROLES)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="primary" loading={inviteMut.isPending} className="sm:shrink-0">
              Send invite
            </Button>
          </form>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-text">Members</h2>
        <ul className="mt-3 divide-y divide-border rounded-[10px] border border-border bg-surface">
          {members.isLoading ? (
            <li className="px-4 py-8 text-sm text-text-muted font-body">Loading…</li>
          ) : list.length === 0 ? (
            <li className="px-4 py-8 text-sm text-text-muted font-body">No members yet.</li>
          ) : (
            list.map((m) => {
              const isSelf = user?.id === m.user_id;
              return (
                <li
                  key={m.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text font-body">
                        {m.display_name?.trim() || m.email}
                      </span>
                      <Badge className={cn("capitalize", roleBadgeClass(m.role))}>
                        {m.role}
                      </Badge>
                      {isSelf ? (
                        <span className="text-xs text-text-muted font-body">(you)</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-text-muted font-body">{m.email}</div>
                  </div>
                  {isOwner ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          patchMut.mutate({ member: m, role: v as (typeof ROLES)[number] })
                        }
                        disabled={patchMut.isPending}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="capitalize">
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10"
                        disabled={removeMut.isPending || (isSelf && m.role === "owner")}
                        onClick={() => {
                          if (
                            !confirm(
                              isSelf
                                ? "Leave this workspace? You will lose access."
                                : `Remove ${m.email} from the workspace?`,
                            )
                          ) {
                            return;
                          }
                          removeMut.mutate(m.id);
                        }}
                      >
                        {isSelf ? "Leave" : "Remove"}
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
