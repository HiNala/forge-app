"use client";

import * as React from "react";
import "./globals.css";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    typeof error.digest === "string" && error.digest.length > 0 ? error.digest : null;

  return (
    <html lang="en" data-theme="light-warm" className="theme-light-warm antialiased">
      <body className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12 font-body text-text">
        <p className="font-display text-2xl font-semibold">We hit a wall</p>
        <p className="mt-3 max-w-md text-center text-sm text-[var(--text-muted)]">
          Something went wrong while loading the app. Try reloading — if it keeps happening, contact support and share
          the error reference below (we use it the same way as a Sentry event ID).
        </p>
        {digest ? (
          <p className="mt-4 font-mono text-[11px] text-text-subtle">
            Error reference: <span className="select-all">{digest}</span>
          </p>
        ) : null}
        <Button type="button" variant="primary" className="mt-8" onClick={() => reset()}>
          Reload
        </Button>
      </body>
    </html>
  );
}
