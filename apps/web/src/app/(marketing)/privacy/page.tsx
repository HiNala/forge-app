import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-prose px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-text">Privacy policy</h1>
      <p className="mt-6 text-sm leading-relaxed text-text-muted">
        Placeholder — DPA, subprocessors, and GDPR posture will be documented for launch (Mission
        FE-07).
      </p>
    </div>
  );
}
