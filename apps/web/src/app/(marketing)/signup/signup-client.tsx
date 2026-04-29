"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForgeAuth } from "@/providers/forge-auth-provider";

const STORAGE_KEY = "forge.pendingTemplateId";
const STORAGE_CHECKOUT = "forge.pendingCheckout";
const STORAGE_WORKFLOW = "forge.pendingWorkflow";

export function SignupClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useForgeAuth();
  const [email, setEmail] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [workspaceName, setWorkspaceName] = React.useState("My workspace");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const tid = searchParams.get("template");
    if (tid) {
      try {
        sessionStorage.setItem(STORAGE_KEY, tid);
      } catch {
        /* ignore */
      }
    }
    const wf = searchParams.get("workflow");
    if (wf) {
      try {
        sessionStorage.setItem(STORAGE_WORKFLOW, wf);
      } catch {
        /* ignore */
      }
    }
    const plan = searchParams.get("plan");
    const billing = searchParams.get("billing");
    const source = searchParams.get("source");
    if (plan ?? billing ?? source) {
      try {
        sessionStorage.setItem(
          STORAGE_CHECKOUT,
          JSON.stringify({
            plan: plan ?? undefined,
            billing: billing ?? undefined,
            source: source ?? undefined,
          }),
        );
      } catch {
        /* ignore */
      }
    }
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await auth.registerWithPassword({
        email,
        password,
        display_name: displayName || null,
        workspace_name: workspaceName || "My workspace",
      });
      router.replace("/signup/continue");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 w-full max-w-[400px] rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="font-display text-lg font-bold tracking-tight text-text">Create your account</h1>
        <p className="font-body text-sm text-text-muted">Start free with email or Google.</p>
      </div>
      <div className="mt-6 space-y-4">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" autoComplete="name" />
        <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Workspace name" required />
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 12 characters" autoComplete="new-password" minLength={12} required />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating account..." : "Sign up free"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => void auth.startGoogleLogin("/signup/continue")}
          disabled={busy}
        >
          Continue with Google
        </Button>
      </div>
    </form>
  );
}
