"use client";

import { useUser } from "@clerk/nextjs";
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

export default function SettingsProfilePage() {
  const { user, isLoaded } = useUser();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [savedHint, setSavedHint] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePhrase, setDeletePhrase] = React.useState("");

  const displaySeed = user?.fullName ?? user?.firstName ?? "";
  React.useEffect(() => {
    if (!displaySeed) return;
    const id = window.setTimeout(() => setName(displaySeed), 0);
    return () => window.clearTimeout(id);
  }, [displaySeed]);

  async function saveDisplayName() {
    if (!user) return;
    setBusy(true);
    try {
      await user.update({ firstName: name.split(/\s+/)[0] ?? name, lastName: name.split(/\s+/).slice(1).join(" ") });
      setSavedHint(true);
      window.setTimeout(() => setSavedHint(false), 2000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <PageHeader
        title="Profile"
        description="How you appear to teammates. Email is managed in your Clerk account."
      />

      {!isLoaded || !user ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <section className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disp">Display name</Label>
              <Input
                id="disp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void saveDisplayName()}
                disabled={busy}
                aria-describedby="disp-hint disp-save"
              />
              <p id="disp-hint" className="text-xs text-text-muted font-body">
                Saves automatically when you leave this field. Syncs to your Clerk profile.
              </p>
              <p id="disp-save" className="text-xs text-text-muted font-body" aria-live="polite">
                {busy ? "Saving…" : savedHint ? "Saved." : null}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="em">Email</Label>
              <Input id="em" value={user.primaryEmailAddress?.emailAddress ?? ""} readOnly className="bg-bg-elevated" />
              <p className="text-xs text-text-muted font-body">
                To change email, use your account portal via Clerk (user button → Manage account).
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Avatar</Label>
              <div className="flex items-center gap-3">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="size-14 rounded-full border border-border object-cover" />
                ) : null}
                <p className="text-xs text-text-muted font-body">Use the account menu in the app header to open Clerk.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display font-semibold text-text">Connected accounts</h2>
            <ul className="mt-2 space-y-3 text-sm text-text-muted font-body">
              {user.externalAccounts?.length ? (
                user.externalAccounts.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {String(a.provider).includes("google") ? "Google" : String(a.provider)} — {a.emailAddress}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (
                          !confirm(
                            "Unlink this account? You must keep another sign-in method active (e.g. password or another provider).",
                          )
                        ) {
                          return;
                        }
                        const destroy = (
                          a as { destroy?: () => Promise<unknown> } | undefined
                        )?.destroy;
                        if (typeof destroy !== "function") {
                          toast.message("Unlink this connection from your Clerk account page.");
                          return;
                        }
                        void destroy
                          .call(a)
                          .then(() => toast.success("Connection removed"))
                          .catch((e: unknown) =>
                            toast.error(e instanceof Error ? e.message : "Could not unlink"),
                          );
                      }}
                    >
                      Unlink
                    </Button>
                  </li>
                ))
              ) : (
                <li>Email/password only.</li>
              )}
            </ul>
          </section>

          <section className="rounded-[10px] border border-danger/40 p-5">
            <h2 className="font-display font-semibold text-danger">Delete my account</h2>
            <p className="mt-1 text-sm text-text-muted font-body">
              Clerk holds your identity — account deletion follows your provider&apos;s policy (typically a grace period).
            </p>
            <Button type="button" variant="secondary" className="mt-3 text-danger" onClick={() => setDeleteOpen(true)}>
              Delete account…
            </Button>
          </section>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent role="alertdialog">
              <DialogHeader>
                <DialogTitle>Delete your Forge account?</DialogTitle>
                <DialogDescription>
                  Type <strong>delete my account</strong> to continue. Your data may be retained up to 30 days per policy
                  before purge.
                </DialogDescription>
              </DialogHeader>
              <Input value={deletePhrase} onChange={(e) => setDeletePhrase(e.target.value)} />
              <DialogFooter>
                <Button type="button" variant="ghost" autoFocus onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={deletePhrase.trim().toLowerCase() !== "delete my account"}
                  onClick={() => {
                    toast.message("Complete account deletion from Clerk’s user management UI.");
                    setDeleteOpen(false);
                  }}
                >
                  Continue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
