"use client";

import * as React from "react";
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

  const ref =
    typeof error.digest === "string" && error.digest.length > 0
      ? error.digest
      : null;

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-text antialiased">
        <p className="font-display text-2xl font-semibold">Forge hit a critical error</p>
        <p className="mt-2 max-w-md text-center text-sm text-text-muted font-body">
          Please refresh the page. If this keeps happening, contact support with the reference below.
        </p>
        {ref ? (
          <p className="mt-4 font-mono text-[11px] text-text-subtle">Reference: {ref}</p>
        ) : null}
        <Button type="button" variant="primary" className="mt-8" onClick={() => reset()}>
          Try again
        </Button>
      </body>
    </html>
  );
}
