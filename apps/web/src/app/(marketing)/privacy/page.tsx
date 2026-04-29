import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-prose px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-display-md text-text">Privacy policy</h1>
      <p className="mt-6 text-body-sm text-text-muted">
        GlideDesign processes product prompts, generated outputs, account data, billing events, and usage analytics to provide the service. DPA, subprocessors, and GDPR posture will be documented for launch.
      </p>
    </div>
  );
}
