"use client";

import * as React from "react";
import Image from "next/image";
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Image
        src="/brand/illustrations/error-glide.svg"
        alt=""
        aria-hidden
        width={640}
        height={420}
        className="mb-6 h-auto w-full max-w-[320px] drop-shadow-sm"
      />
      <p className="text-h2 text-text">This screen missed its mark</p>
      <p className="mt-2 max-w-md text-body-sm text-text-muted">
        We couldn&apos;t load this screen. Your work is safe — reload the screen, or head back to the dashboard.
      </p>
      {ref ? (
        <p className="mt-4 font-mono text-[11px] text-text-subtle">
          Support reference (include in your message): {ref}
        </p>
      ) : null}
      <Button type="button" variant="primary" className="mt-8" onClick={() => reset()}>
        Reload screen
      </Button>
    </div>
  );
}
