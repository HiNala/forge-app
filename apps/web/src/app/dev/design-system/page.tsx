import { notFound } from "next/navigation";
import { PrimitivesShowcase } from "@/app/dev/primitives/primitives-showcase";

export const metadata = {
  title: "Design system | GlideDesign",
  robots: { index: false, follow: false },
};

/** Dev-only: every primitive in every major state (Mission FE-01). */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return (
    <div className="mx-auto max-w-5xl pb-24">
      <header className="mb-10">
        <h1 className="font-display text-3xl font-semibold text-text">Design system</h1>
        <p className="mt-2 text-sm text-text-muted font-body">
          Dev-only — canonical primitive matrix for accessibility review and visual regression. Not
          shipped in production (<code className="text-accent">404</code>).
        </p>
      </header>
      <PrimitivesShowcase />
    </div>
  );
}
