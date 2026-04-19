"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/chrome/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteOrg, getOrg, patchOrg } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { useRouter } from "next/navigation";

export default function WorkspaceSettingsPage() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const { activeOrganizationId, activeRole } = useForgeSession();
  const owner = activeRole === "owner";

  const orgQ = useQuery({
    queryKey: ["org", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getOrg(getToken, activeOrganizationId),
  });

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const orgName = orgQ.data?.name ?? "";
  const orgSlug = orgQ.data?.slug ?? "";
  React.useEffect(() => {
    if (!orgQ.data) return;
    const id = window.setTimeout(() => {
      setName(orgName);
      setSlug(orgSlug);
    }, 0);
    return () => window.clearTimeout(id);
  }, [orgQ.data, orgName, orgSlug]);

  const [savedTick, setSavedTick] = React.useState(false);
  const patchMut = useMutation({
    mutationFn: (body: { name?: string; slug?: string }) => patchOrg(getToken, activeOrganizationId, body),
    onSuccess: () => {
      toast.success("Saved");
      void qc.invalidateQueries({ queryKey: ["org", activeOrganizationId] });
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 2000);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const debounceRef = React.useRef<number | null>(null);
  const queueSave = (body: { name?: string; slug?: string }) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => patchMut.mutate(body), 500);
  };

  const [delOpen, setDelOpen] = React.useState(false);
  const [delConfirm, setDelConfirm] = React.useState("");
  const delMut = useMutation({
    mutationFn: () => deleteOrg(getToken, activeOrganizationId),
    onSuccess: () => {
      toast.success("Workspace scheduled for deletion");
      router.push("/dashboard");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <PageHeader title="Workspace" description="Name and URL slug for this workspace. Changes save automatically." />

      {orgQ.isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : orgQ.data ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                queueSave({ name: e.target.value });
              }}
              onBlur={() => patchMut.mutate({ name })}
              disabled={!owner}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-slug">Slug</Label>
            <Input
              id="ws-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                queueSave({ slug: e.target.value });
              }}
              onBlur={() => patchMut.mutate({ slug })}
              disabled={!owner}
              aria-describedby="ws-slug-hint"
            />
            <p id="ws-slug-hint" className="text-xs text-text-muted font-body">
              Used in public URLs. Must stay unique — the API rejects conflicts.
            </p>
          </div>
          <p className="text-xs text-text-muted font-body" aria-live="polite">
            {patchMut.isPending ? "Saving…" : savedTick ? "Saved" : null}
          </p>
        </section>
      ) : null}

      {owner ? (
        <section className="rounded-[10px] border border-danger/40 bg-surface p-5">
          <h2 className="font-display font-semibold text-danger">Danger zone</h2>
          <p className="mt-1 text-sm text-text-muted font-body">
            Deleting a workspace schedules it for removal after a grace period.
          </p>
          <Button type="button" variant="secondary" className="mt-4 text-danger" onClick={() => setDelOpen(true)}>
            Delete workspace
          </Button>
        </section>
      ) : null}

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent role="alertdialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this workspace?</DialogTitle>
            <DialogDescription>
              Type <strong>delete my workspace</strong> to confirm. This is scheduled with a grace period per policy.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={delConfirm}
            onChange={(e) => setDelConfirm(e.target.value)}
            placeholder="delete my workspace"
            autoComplete="off"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDelOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={delMut.isPending}
              disabled={delConfirm.trim().toLowerCase() !== "delete my workspace"}
              onClick={() => delMut.mutate()}
            >
              Delete workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
