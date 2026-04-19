import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { ForgeMark } from "@/components/chrome/forge-logo";

export const metadata: Metadata = {
  title: "Sign in | Forge",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-bg px-4 py-12 sm:py-16">
      <div className="mb-8 flex flex-col items-center gap-3">
        <ForgeMark className="size-10 text-text" />
        <div className="text-center">
          <p className="font-display text-[28px] font-bold tracking-tight text-text leading-none">
            Forge
          </p>
          <p className="mt-2 font-body text-sm font-light text-text-muted">
            Your pages, already built.
          </p>
        </div>
      </div>

      <div className="w-full max-w-[400px]">
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "shadow-none border border-border bg-surface rounded-2xl",
              headerTitle: "font-display text-lg font-bold tracking-tight",
              headerSubtitle: "font-body text-sm text-text-muted",
              formButtonPrimary:
                "bg-text text-bg hover:opacity-80 text-sm font-semibold rounded-xl shadow-none transition-opacity",
              footerActionLink: "text-text font-semibold underline-offset-4 hover:underline",
              formFieldInput:
                "rounded-xl border-border bg-bg font-body text-sm focus:ring-2 focus:ring-text/20 focus:border-text/40",
              formFieldLabel: "font-body text-sm font-medium text-text",
              identityPreviewText: "font-body text-sm",
              socialButtonsBlockButton:
                "rounded-xl border border-border font-body text-sm hover:bg-bg-elevated transition-colors",
              dividerLine: "bg-border",
              dividerText: "font-body text-xs text-text-subtle",
            },
          }}
          signUpUrl="/signup"
          forceRedirectUrl="/dashboard"
        />
      </div>

      <p className="mt-6 font-body text-xs text-text-subtle">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="font-medium text-text underline-offset-4 hover:underline">
          Sign up free
        </a>
      </p>
    </div>
  );
}
