"use client";

import { useAuth, useUser } from "@/providers/forge-auth-provider";
import { useRouter } from "next/navigation";
import * as React from "react";
import { postSignup, postTemplateUse } from "@/lib/api";

function workspaceNameFromEmail(email: string | undefined): string {
  if (!email) return "My workspace";
  const local = email.split("@")[0] ?? "team";
  const tidied = local.replace(/[._-]+/g, " ").trim();
  if (!tidied) return "My workspace";
  const cap = tidied.charAt(0).toUpperCase() + tidied.slice(1);
  return `${cap} workspace`;
}

export default function SignupContinuePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        if (!user.emailVerified) {
          router.replace("/verify-email?next=/signup/continue");
          return;
        }
        const name = workspaceNameFromEmail(user.primaryEmailAddress?.emailAddress);
        const r = await postSignup(() => getToken(), name);
        let pending: string | null = null;
        try {
          pending = sessionStorage.getItem("forge.pendingTemplateId");
        } catch {
          pending = null;
        }
        if (pending) {
          try {
            sessionStorage.removeItem("forge.pendingTemplateId");
            const out = await postTemplateUse(() => getToken(), r.organization_id, pending);
            router.replace(out.studio_path);
            return;
          } catch {
            /* fall through */
          }
        }
        let pendingWf: string | null = null;
        try {
          pendingWf = sessionStorage.getItem("forge.pendingWorkflow");
          if (pendingWf) sessionStorage.removeItem("forge.pendingWorkflow");
        } catch {
          pendingWf = null;
        }
        router.replace(pendingWf ? `/onboarding?workflow=${encodeURIComponent(pendingWf)}` : "/onboarding");
      } catch {
        router.replace("/dashboard");
      }
    })();
  }, [isLoaded, isSignedIn, user, getToken, router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-4 py-16">
      <div className="font-display text-lg text-text">Preparing your workspace…</div>
      <p className="mt-2 text-sm text-text-muted font-body">This takes just a moment.</p>
    </div>
  );
}
