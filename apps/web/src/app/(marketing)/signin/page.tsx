import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GlideDesignMark } from "@/components/chrome/forge-logo";
import { SigninClient } from "./signin-client";

export const metadata: Metadata = {
  title: "Sign in | GlideDesign",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-4 py-12 sm:py-16">
      <div className="mb-8 flex flex-col items-center gap-3">
        <GlideDesignMark className="size-10 text-text" />
        <div className="text-center">
          <p className="font-display text-[28px] font-bold tracking-tight text-text leading-none">
            GlideDesign
          </p>
          <p className="mt-2 font-body text-sm font-light text-text-muted">
            Your pages, already built.
          </p>
        </div>
      </div>

      <div className="w-full max-w-[400px]">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl border border-border bg-surface" />}>
          <SigninClient />
        </Suspense>
      </div>

      <p className="mt-6 font-body text-xs text-text-subtle">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-text underline-offset-4 hover:underline">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
