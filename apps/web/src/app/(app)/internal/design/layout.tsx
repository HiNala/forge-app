"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { getPlatformSession } from "@/lib/api";

export default function InternalDesignLayout({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const sessionQ = useQuery({
    queryKey: ["platform-session"],
    queryFn: () => getPlatformSession(getToken),
    retry: false,
  });

  const isDev = process.env.NODE_ENV === "development";
  const allowed = isDev || Boolean(sessionQ.data);

  if (!isDev && sessionQ.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 font-body text-sm text-text-muted">
        <span className="size-4 animate-pulse rounded-full bg-bg-elevated" />
        Loading…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md py-16 text-center font-body">
        <p className="type-heading text-text">Design tools are restricted</p>
        <p className="mt-2 text-sm text-text-muted">
          Open in development or sign in as a platform administrator.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-8">
      <div className="mb-8 border-b border-border pb-6">
        <p className="section-label mb-2">Internal</p>
        <h1 className="type-display text-text">Design system</h1>
        <p className="type-caption mt-2 max-w-prose">
          Token snapshot and component showcase for P-09 polish. Not linked in product navigation.
        </p>
        <nav className="mt-6 flex flex-wrap gap-3 text-sm font-medium">
          <Link className="text-accent hover:underline" href="/internal/design/tokens">
            Tokens
          </Link>
          <span className="text-text-subtle">/</span>
          <Link className="text-accent hover:underline" href="/internal/design/showcase">
            Showcase
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
