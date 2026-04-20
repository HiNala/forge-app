"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelTeamInvitation,
  deleteTeamMember,
  getOrg,
  getPendingInvitations,
  getTeamMembers,
  patchTeamMember,
  postTeamInvite,
  postTransferOwnership,
  type MemberOut,
} from "@/lib/api";
import { teamSeatLimit } from "@/lib/team-seats";
import { useForgeSession } from "@/providers/session-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const [inviteText, setInviteText] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<(typeof ROLES)[number]>("editor");
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [transferMember, setTransferMember] = React.useState<string>("");
  const [removeMember, setRemoveMember] = React.useState<MemberOut | null>(null);

  const orgQ = useQuery({
    queryKey: ["org", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getOrg(getToken, activeOrganizationId),
  });

  const members = useQuery({
    queryKey: ["team-members", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getTeamMembers(getToken, activeOrganizationId),
  });

  const pending = useQuery({
    queryKey: ["team-invites", activeOrganizationId],
    enabled: !!activeOrganizationId && isOwner,
    queryFn: () => getPendingInvitations(getToken, activeOrganizationId),
  });

  const inviteMut = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) throw new Error("No workspace");
      const raw = inviteText.trim();
      if (!raw) throw new Error("Enter at least one email");
      return postTeamInvite(getToken, activeOrganizationId, {
        emails: raw,
        role: inviteRole,
      });
    },
    onSuccess: () => {
      toast.success("Invitation sent");
      setInviteText("");
      void qc.invalidateQueries({ queryKey: ["team-invites", activeOrganizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transferMut = useMutation({
    mutationFn: async () => {
      if (!transferMember) throw new Error("Pick a member");
      return postTransferOwnership(getToken, activeOrganizationId, transferMember);
    },
    onSuccess: async () => {
      toast.success("Ownership transferred");
      setTransferOpen(false);
      await qc.invalidateQueries({ queryKey: ["team-members", activeOrganizationId] });
      await qc.invalidateQueries({ queryKey: ["me"] });
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

  const cancelInv = useMutation({
    mutationFn: async (id: string) => cancelTeamInvitation(getToken, activeOrganizationId, id),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      void qc.invalidateQueries({ queryKey: ["team-invites", activeOrganizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = members.data ?? [];
  const org = orgQ.data;
  const cap = org ? teamSeatLimit(org.plan, org.trial_ends_at) : 3;
  const used = list.length + (pending.data?.length ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Team</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          Invite collaborators and manage roles. Ownership transfer is atomic.
        </p>
      </div>

      {isOwner ? (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <h2 className="font-display text-base font-bold text-text">Invite people</h2>
            <p className="text-xs text-text-muted font-body">
              Using {used} of {cap} seats
            </p>
          </div>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (used >= cap) {
                toast.error("Seat limit reached. Upgrade to invite more.");
                return;
              }
              inviteMut.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="invite-emails">Emails (comma or newline)</Label>
              <Textarea
                id="invite-emails"
                rows={3}
                placeholder={"you@studio.com\ncoach@studio.com"}
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
              />
            </div>
            <div className="flex max-w-md flex-col gap-4 sm:flex-row sm:items-end">
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
              <Button
                type="submit"
                variant="primary"
                loading={inviteMut.isPending}
                disabled={used >= cap}
                className="sm:ml-auto"
              >
                Send invites
              </Button>
            </div>
          </form>
          {used >= cap ? (
            <p className="mt-3 text-sm text-amber-700 font-body">
              Seat limit reached.{" "}
              <Link href="/settings/billing" className="font-medium underline">
                Upgrade plan
              </Link>
              .
            </p>
          ) : null}

          <div className="mt-6 border-t border-border pt-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setTransferOpen(true)}>
              Transfer ownership…
            </Button>
          </div>
        </section>
      ) : null}

      {isOwner && pending.data && pending.data.length > 0 ? (
        <section>
          <h2 className="font-body text-sm font-bold text-text">Pending invitations</h2>
          <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
            {pending.data.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{inv.email}</span>
                  <span className="text-text-muted"> · {inv.role}</span>
                  <p className="text-xs text-text-muted">
                    {inv.invited_by_email ? `Invited by ${inv.invited_by_email} · ` : ""}
                    {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => cancelInv.mutate(inv.id)}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <TooltipProvider delayDuration={200}>
        <section>
          <h2 className="font-display text-base font-bold text-text">Members</h2>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface overflow-hidden">
            {members.isLoading ? (
              <li className="px-4 py-8 text-sm text-text-muted font-body">Loading…</li>
            ) : list.length === 0 ? (
              <li className="px-4 py-8 text-sm text-text-muted font-body">No members yet.</li>
            ) : (
              list.map((m) => {
                const isSelf = user?.id === m.user_id;
                const ownerCount = list.filter((x) => x.role === "owner").length;
                const lastOwnerLocked = m.role === "owner" && ownerCount <= 1;
                return (
                  <li
                    key={m.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={m.display_name?.trim() || m.email}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-body font-semibold text-text">
                            {m.display_name?.trim() || m.email}
                          </span>
                          <Badge className={cn("capitalize", roleBadgeClass(m.role))}>{m.role}</Badge>
                          {isSelf ? <span className="font-body text-xs text-text-muted">(you)</span> : null}
                        </div>
                        <div className="mt-0.5 truncate font-body text-xs text-text-muted">{m.email}</div>
                        <p className="mt-0.5 font-body text-xs text-text-subtle">
                          Joined {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {isOwner ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {lastOwnerLocked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block w-[140px]">
                                <Select
                                  value={m.role}
                                  onValueChange={(v) =>
                                    patchMut.mutate({ member: m, role: v as (typeof ROLES)[number] })
                                  }
                                  disabled
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
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Add another owner before changing the last owner&apos;s role.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
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
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-danger hover:bg-danger/10"
                          disabled={removeMut.isPending || lastOwnerLocked}
                          onClick={() => setRemoveMember(m)}
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
      </TooltipProvider>

      <Dialog
        open={!!removeMember}
        onOpenChange={(o) => {
          if (!o) setRemoveMember(null);
        }}
      >
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>{removeMember && user?.id === removeMember.user_id ? "Leave workspace?" : "Remove member?"}</DialogTitle>
            <DialogDescription>
              {removeMember
                ? `${removeMember.email} will lose access to pages, submissions, and billing for this workspace.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" autoFocus onClick={() => setRemoveMember(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={removeMut.isPending}
              onClick={() => {
                if (!removeMember) return;
                removeMut.mutate(removeMember.id, {
                  onSuccess: () => setRemoveMember(null),
                });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>
              Select a member to become Owner. You will become an Editor. This cannot target yourself. Re-authenticate in
              your account portal if your organization requires it — Forge will swap roles in one step once confirmed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Member</Label>
            <Select value={transferMember} onValueChange={setTransferMember}>
              <SelectTrigger>
                <SelectValue placeholder="Choose member" />
              </SelectTrigger>
              <SelectContent>
                {list
                  .filter((m) => m.user_id !== user?.id)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name || m.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={transferMut.isPending}
              disabled={!transferMember}
              onClick={() => transferMut.mutate()}
            >
              Confirm transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
