import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-prose px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-display-md text-text">Terms of service</h1>
      <p className="mt-6 text-body-sm text-text-muted">
        These terms govern use of GlideDesign. Final legal review ships before public launch; until then, use this page as the canonical GlideDesign legal surface placeholder.
      </p>
    </div>
  );
}
