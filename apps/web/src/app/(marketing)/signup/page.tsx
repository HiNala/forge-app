import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ForgeMark } from "@/components/chrome/forge-logo";
import { SignupClient } from "./signup-client";

export const metadata: Metadata = {
  title: "Sign up | Forge",
  description: "Create your Forge account — describe pages in plain English and publish hosted links.",
  alternates: { canonical: "/signup" },
};

export default function SignUpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-4 py-12 sm:py-16">
      <div className="mb-8 flex flex-col items-center gap-3">
        <ForgeMark className="size-10 text-text" />
        <div className="text-center">
          <p className="font-display text-[28px] font-bold tracking-tight text-text leading-none">
            Forge
          </p>
          <p className="mt-2 font-body text-sm font-light text-text-muted">
            Type a sentence. Get a live page.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="h-80 w-full max-w-[400px] animate-pulse rounded-2xl bg-surface border border-border" />
        }
      >
        <SignupClient />
      </Suspense>

      <p className="mt-6 font-body text-xs text-text-subtle">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-text underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
