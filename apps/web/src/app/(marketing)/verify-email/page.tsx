"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { postResendEmailVerification, postVerifyEmail } from "@/lib/api";
import { useAuth, useUser } from "@/providers/forge-auth-provider";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { getToken } = useAuth();
  const { user, isLoaded, isSignedIn } = useUser();
  const token = params.get("token");
  const next = params.get("next") || "/dashboard";
  const [status, setStatus] = React.useState<"idle" | "verifying" | "verified" | "error">(
    token ? "verifying" : "idle",
  );
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        await postVerifyEmail(token);
        if (cancelled) return;
        setStatus("verified");
        toast.success("Email verified");
        window.setTimeout(() => router.replace(next), 900);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        toast.error(err instanceof Error ? err.message : "Could not verify email");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next, router, token]);

  async function resend() {
    setResending(true);
    try {
      const out = await postResendEmailVerification(getToken);
      if (out.already_verified) {
        toast.success("Email already verified");
        router.replace(next);
      } else if (out.sent) {
        toast.success("Verification email sent");
      } else {
        toast.info("Verification email queued");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend verification email");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-bg px-4 py-16">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-accent">Account security</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-text">Verify your email</h1>
        <p className="mt-3 font-body text-sm leading-6 text-text-muted">
          {status === "verified"
            ? "You're verified. Redirecting you back to GlideDesign..."
            : "Check your inbox for a verification link before generating or publishing designs."}
        </p>
        {isLoaded && isSignedIn && user?.email ? (
          <p className="mt-3 rounded-xl border border-border bg-bg-elevated px-3 py-2 font-body text-sm text-text">
            Signed in as <span className="font-semibold">{user.email}</span>
          </p>
        ) : null}
        {status === "verifying" ? (
          <p className="mt-4 font-body text-sm text-text-muted">Verifying your link...</p>
        ) : null}
        {status === "error" ? (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 font-body text-sm text-danger">
            This verification link is invalid or expired. Send a new one below.
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          {isSignedIn ? (
            <Button type="button" onClick={() => void resend()} loading={resending}>
              Resend verification email
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/signin?next=${encodeURIComponent(`/verify-email?next=${next}`)}`}>Sign in to resend</Link>
            </Button>
          )}
          <Button asChild type="button" variant="secondary">
            <Link href="/signin">Back to sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
