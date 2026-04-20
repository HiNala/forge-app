import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Global 404 — used for unmatched routes (FE-07). */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-bg px-4 py-16 text-center">
      <p className="section-label">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
        This page isn&apos;t here
      </h1>
      <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-text-muted font-body">
        The link may be mistyped, or the page moved. If you were expecting something in Forge,
        start from home or sign in.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary">
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/signin">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
