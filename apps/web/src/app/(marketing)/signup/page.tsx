import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupClient } from "./signup-client";

export const metadata: Metadata = {
  title: "Sign up | Forge",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-4 py-12 sm:py-16">
      <div className="font-display text-[22px] font-semibold tracking-tight text-text">
        Forge
      </div>
      <p className="mt-2 text-center text-sm text-text-muted font-body">
        Create your workspace
      </p>
      <Suspense
        fallback={
          <div className="mt-10 h-80 w-full max-w-[400px] animate-pulse rounded-lg bg-surface-muted" />
        }
      >
        <SignupClient />
      </Suspense>
    </div>
  );
}
