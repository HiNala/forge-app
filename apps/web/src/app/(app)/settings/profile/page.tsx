"use client";

import { useUser } from "@clerk/nextjs";
import * as React from "react";
import { toast } from "sonner";
import { Check, User } from "lucide-react";
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
import { cn } from "@/lib/utils";

function SettingRow({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5 sm:grid-cols-[200px_1fr] sm:gap-8 sm:items-start", className)}>
      <div className="pt-0.5">
        <p className="font-body text-sm font-semibold text-text">{label}</p>
        {hint ? <p className="mt-0.5 font-body text-xs leading-relaxed text-text-subtle">{hint}</p> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-base font-bold leading-tight text-text">{children}</h2>
  );
}

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
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      await user.update({
        firstName: name.split(/\s+/)[0] ?? name,
        lastName: name.split(/\s+/).slice(1).join(" "),
      });
      setSavedHint(true);
      window.setTimeout(() => setSavedHint(false), 2500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded || !user) {
    return (
      <div className="space-y-4">
        {[200, 160, 140].map((w) => (
          <div key={w} className="h-14 animate-pulse rounded-xl bg-bg-elevated" style={{ maxWidth: w }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Profile</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          How you appear to teammates. Email is managed through your account provider.
        </p>
      </div>

      {/* Identity section */}
      <section className="space-y-6 rounded-2xl border border-border bg-surface p-6">
        <SectionHeading>Identity</SectionHeading>

        {/* Avatar */}
        <SettingRow label="Avatar" hint="Managed through your account provider.">
          <div className="flex items-center gap-4">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName ?? "Avatar"}
                className="size-14 rounded-full border border-border object-cover shadow-sm"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full border border-border bg-bg-elevated">
                <User className="size-6 text-text-subtle" aria-hidden />
              </div>
            )}
            <p className="font-body text-xs text-text-subtle">
              Change via the account menu → Manage account.
            </p>
          </div>
        </SettingRow>

        <div className="border-t border-border" />

        {/* Display name */}
        <SettingRow
          label="Display name"
          hint="Visible to teammates in shared workspaces."
        >
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="disp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void saveDisplayName()}
                disabled={busy}
                placeholder="Your name"
                aria-describedby="disp-hint disp-save"
                className="pr-9"
              />
              {savedHint && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-accent">
                  <Check className="size-4" aria-hidden />
                </span>
              )}
            </div>
            <p id="disp-hint" className="font-body text-xs text-text-subtle" aria-live="polite">
              {busy ? "Saving…" : savedHint ? "Saved." : "Saves automatically when you leave this field."}
            </p>
          </div>
        </SettingRow>

        <div className="border-t border-border" />

        {/* Email */}
        <SettingRow
          label="Email address"
          hint="To change email, use Manage account in the sidebar."
        >
          <Input
            id="em"
            value={user.primaryEmailAddress?.emailAddress ?? ""}
            readOnly
            className="cursor-default bg-bg-elevated text-text-muted"
          />
        </SettingRow>
      </section>

      {/* Connected accounts */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-6">
        <SectionHeading>Connected accounts</SectionHeading>
        {user.externalAccounts?.length ? (
          <ul className="space-y-3">
            {user.externalAccounts.map((a) => {
              const providerName = String(a.provider).includes("google")
                ? "Google"
                : String(a.provider);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg px-4 py-3"
                >
                  <div>
                    <p className="font-body text-sm font-semibold text-text">{providerName}</p>
                    <p className="font-body text-xs text-text-muted">{a.emailAddress}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (!confirm("Unlink this account? You must keep another sign-in method active.")) return;
                      const destroy = (a as { destroy?: () => Promise<unknown> })?.destroy;
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
              );
            })}
          </ul>
        ) : (
          <p className="font-body text-sm text-text-muted">Email / password only — no linked providers.</p>
        )}
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-danger/30 bg-surface p-6">
        <SectionHeading>
          <span className="text-danger">Danger zone</span>
        </SectionHeading>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          Account deletion is permanent after your provider&apos;s grace period (typically 30 days).
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4 border-danger/40 text-danger hover:bg-danger/5 hover:border-danger/70"
          onClick={() => setDeleteOpen(true)}
        >
          Delete account…
        </Button>
      </section>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-text">Delete your account?</DialogTitle>
            <DialogDescription className="font-body text-sm text-text-muted">
              Type <strong className="text-text">delete my account</strong> to continue. Your data
              may be retained up to 30 days per policy before purge.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
            placeholder="delete my account"
            className="mt-2"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" autoFocus onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deletePhrase.trim().toLowerCase() !== "delete my account"}
              onClick={() => {
                toast.message("Complete account deletion from Clerk's user management UI.");
                setDeleteOpen(false);
              }}
            >
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
