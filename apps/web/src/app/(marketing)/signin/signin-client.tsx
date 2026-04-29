"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForgeAuth } from "@/providers/forge-auth-provider";

export function SigninClient() {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useForgeAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const next = params.get("next") || "/dashboard";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const tokens = await auth.signInWithPassword(email, password);
      if (!tokens.user.email_verified) {
        router.replace(`/verify-email?next=${encodeURIComponent(next)}`);
        return;
      }
      router.replace(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="font-display text-lg font-bold tracking-tight text-text">Sign in</h1>
        <p className="font-body text-sm text-text-muted">Use email and password or continue with Google.</p>
      </div>
      <div className="mt-6 space-y-4">
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => void auth.startGoogleLogin(next)}
          disabled={busy}
        >
          Continue with Google
        </Button>
      </div>
    </form>
  );
}
