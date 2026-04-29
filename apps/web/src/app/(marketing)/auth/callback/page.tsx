"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForgeAuth } from "@/providers/forge-auth-provider";

export default function AuthCallbackPage() {
  const router = useRouter();
  const auth = useForgeAuth();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const next = params.get("next") || "/dashboard";
    if (accessToken && refreshToken) {
      void auth.acceptOAuthTokens(accessToken, refreshToken).then(() => {
        router.replace(next);
      });
      return;
    }
    router.replace("/signin?error=oauth_callback");
  }, [auth, router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-4 py-16">
      <div className="font-display text-lg text-text">Finishing sign in...</div>
      <p className="mt-2 font-body text-sm text-text-muted">This takes just a moment.</p>
    </div>
  );
}
