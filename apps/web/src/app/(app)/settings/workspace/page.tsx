"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
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
import { deleteOrg, getOrg, patchOrg } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { useRouter } from "next/navigation";

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[200px_1fr] sm:items-start sm:gap-8">
      <div className="pt-0.5">
        <p className="font-body text-sm font-semibold text-text">{label}</p>
        {hint ? <p className="mt-0.5 font-body text-xs leading-relaxed text-text-subtle">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

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
  const [savedTick, setSavedTick] = React.useState(false);

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

  const patchMut = useMutation({
    mutationFn: (body: { name?: string; slug?: string }) =>
      patchOrg(getToken, activeOrganizationId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", activeOrganizationId] });
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 2500);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const debounceRef = React.useRef<number | null>(null);
  const queueSave = (body: { name?: string; slug?: string }) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => patchMut.mutate(body), 600);
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
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Workspace</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          Name and public URL slug for this workspace.
        </p>
      </div>

      {orgQ.isLoading ? (
        <div className="space-y-3">
          {[240, 180].map((w) => (
            <div key={w} className="h-14 animate-pulse rounded-xl bg-bg-elevated" style={{ maxWidth: w }} />
          ))}
        </div>
      ) : orgQ.data ? (
        <section className="space-y-6 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-base font-bold text-text">General</h2>

          <SettingRow label="Workspace name" hint="Shown in the sidebar and shared links.">
            <div className="relative">
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  queueSave({ name: e.target.value });
                }}
                onBlur={() => patchMut.mutate({ name })}
                disabled={!owner}
                className="pr-9"
              />
              {savedTick && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-accent">
                  <Check className="size-4" aria-hidden />
                </span>
              )}
            </div>
          </SettingRow>

          <div className="border-t border-border" />

          <SettingRow
            label="URL slug"
            hint="Used in public page URLs — forge.app/p/your-slug. Must be unique."
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0 font-body text-sm text-text-subtle">forge.app/p/</span>
                <Input
                  id="ws-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    queueSave({ slug: e.target.value });
                  }}
                  onBlur={() => patchMut.mutate({ slug })}
                  disabled={!owner}
                  className="flex-1"
                />
              </div>
              <p className="font-body text-xs text-text-subtle" aria-live="polite">
                {patchMut.isPending ? "Saving…" : savedTick ? "Saved." : "Saves automatically when you leave this field."}
              </p>
            </div>
          </SettingRow>

          {!owner && (
            <p className="font-body text-xs text-text-subtle">
              Only workspace owners can edit these settings.
            </p>
          )}
        </section>
      ) : null}

      {owner && (
        <section className="rounded-2xl border border-danger/30 bg-surface p-6">
          <h2 className="font-display text-base font-bold text-danger">Danger zone</h2>
          <p className="mt-1.5 font-body text-sm text-text-muted">
            Deleting this workspace schedules it for removal after a grace period. All pages and data will be purged.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4 border-danger/40 text-danger hover:border-danger/70 hover:bg-danger/5"
            onClick={() => setDelOpen(true)}
          >
            Delete workspace…
          </Button>
        </section>
      )}

      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent role="alertdialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Delete this workspace?</DialogTitle>
            <DialogDescription className="font-body text-sm text-text-muted">
              Type <strong className="text-text">delete my workspace</strong> to confirm.
              This is scheduled with a grace period per policy.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={delConfirm}
            onChange={(e) => setDelConfirm(e.target.value)}
            placeholder="delete my workspace"
            autoComplete="off"
            className="mt-2"
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
