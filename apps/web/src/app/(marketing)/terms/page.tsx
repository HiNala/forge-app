import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-prose px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-text">Terms of service</h1>
      <p className="mt-6 text-sm leading-relaxed text-text-muted">
        Placeholder — legal review and final copy ship before public launch (Mission FE-07).
      </p>
    </div>
  );
}
