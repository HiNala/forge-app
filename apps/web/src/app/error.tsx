"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary — covers routes outside `(app)` (e.g. marketing) and any
 * error below the root layout that `global-error` does not catch.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  const ref =
    typeof error.digest === "string" && error.digest.length > 0
      ? error.digest
      : null;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-bg px-4 py-16 text-center">
      <p className="section-label">Error</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-text-muted font-body">
        We couldn&apos;t finish loading this page. Your work is safe — try again, or go back to a known place.
      </p>
      {ref ? (
        <p className="mt-4 font-mono text-[11px] text-text-subtle">
          Support reference (include in your message):{" "}
          <span className="select-all">{ref}</span>
        </p>
      ) : null}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="primary" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
