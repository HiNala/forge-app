"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import * as React from "react";
import { X } from "lucide-react";
import { patchUserPreferences } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { Button } from "@/components/ui/button";

/**
 * One-time tip after onboarding — dismissed via `PATCH /auth/me/preferences`.
 */
export function DashboardTipBanner() {
  const { getToken } = useAuth();
  const router = useRouter();
  const { me, refetchSession } = useForgeSession();
  const [busy, setBusy] = React.useState(false);

  const dismissed =
    (me?.preferences?.dashboard_tip_dismissed as boolean | undefined) === true;

  if (dismissed) return null;

  async function dismiss() {
    setBusy(true);
    try {
      await patchUserPreferences(() => getToken(), { dashboard_tip_dismissed: true });
      await refetchSession();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="mb-6 flex flex-col gap-3 rounded-2xl border border-accent/25 bg-accent-light/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="region"
      aria-label="Tip"
    >
      <p className="text-sm font-medium text-text font-body">
        Tip: Click <strong>Studio</strong> in the sidebar to describe your first page.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="font-body"
          onClick={() => router.push("/studio")}
        >
          Open Studio
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="font-body"
          disabled={busy}
          aria-label="Dismiss tip"
          onClick={() => void dismiss()}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
