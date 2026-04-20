"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-2xl font-bold text-text">Something went wrong</p>
      <p className="mt-2 max-w-md text-sm text-text-muted font-body">
        We couldn&apos;t load this screen. Your work is safe — try again, or head back to the dashboard.
      </p>
      {ref ? (
        <p className="mt-4 font-mono text-[11px] text-text-subtle">
          Support reference (include in your message): {ref}
        </p>
      ) : null}
      <Button type="button" variant="primary" className="mt-8" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
