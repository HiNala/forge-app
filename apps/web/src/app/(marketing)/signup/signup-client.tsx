"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import * as React from "react";

const STORAGE_KEY = "forge.pendingTemplateId";
const STORAGE_CHECKOUT = "forge.pendingCheckout";
const STORAGE_WORKFLOW = "forge.pendingWorkflow";

export function SignupClient() {
  const searchParams = useSearchParams();

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

  return (
    <div className="mt-10 w-full max-w-[400px]">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto w-full",
            card: "shadow-none border border-border bg-surface rounded-2xl",
            headerTitle: "font-display text-lg font-bold tracking-tight",
            headerSubtitle: "font-body text-sm text-text-muted",
            formButtonPrimary:
              "bg-text text-bg hover:opacity-80 text-sm font-semibold rounded-xl shadow-none transition-opacity",
            footerActionLink: "text-text font-semibold underline-offset-4 hover:underline",
            formFieldInput:
              "rounded-xl border-border bg-bg font-body text-sm focus:ring-2 focus:ring-text/20 focus:border-text/40",
            formFieldLabel: "font-body text-sm font-medium text-text",
            socialButtonsBlockButton:
              "rounded-xl border border-border font-body text-sm hover:bg-bg-elevated transition-colors",
            dividerLine: "bg-border",
            dividerText: "font-body text-xs text-text-subtle",
          },
        }}
        signInUrl="/signin"
        forceRedirectUrl="/signup/continue"
      />
    </div>
  );
}
