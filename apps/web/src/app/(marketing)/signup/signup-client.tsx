"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import * as React from "react";

const STORAGE_KEY = "forge.pendingTemplateId";
const STORAGE_CHECKOUT = "forge.pendingCheckout";

export function SignupClient() {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const wf = searchParams.get("workflow");
    if (wf) {
      try {
        sessionStorage.setItem("forge.pendingWorkflow", wf);
      } catch {
        /* ignore */
      }
    }
    const tid = searchParams.get("template");
    if (tid) {
      try {
        sessionStorage.setItem(STORAGE_KEY, tid);
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
            card: "shadow-lg border border-border bg-surface rounded-[10px]",
            headerTitle: "font-display",
            formButtonPrimary:
              "bg-accent hover:bg-accent/90 text-sm font-medium shadow-sm",
            footerActionLink: "text-accent font-medium",
            formFieldInput:
              "rounded-md border-border focus:ring-accent-mid focus:border-accent",
          },
        }}
        signInUrl="/signin"
        forceRedirectUrl="/signup/continue"
      />
    </div>
  );
}
