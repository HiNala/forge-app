import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

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
      <div className="mt-10 w-full max-w-[400px]">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "shadow-lg border border-border bg-surface rounded-[10px]",
              headerTitle: "font-display",
              formButtonPrimary:
                "bg-accent hover:bg-accent/90 text-sm font-medium shadow-sm",
              footerActionLink: "text-accent font-medium",
              formFieldInput:
                "rounded-md border-border focus:ring-accent-mid focus:border-accent",
            },
          }}
          signInUrl="/signin"
          forceRedirectUrl="/signup/continue"
        />
      </div>
    </div>
  );
}
