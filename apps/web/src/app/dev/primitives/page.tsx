import { notFound } from "next/navigation";
import { PrimitivesShowcase } from "./primitives-showcase";

export const metadata = {
  title: "Primitives | Forge",
  robots: { index: false, follow: false },
};

export default function DevPrimitivesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return (
    <div className="mx-auto max-w-5xl pb-24">
      <header className="mb-10">
        <h1 className="font-display text-3xl font-semibold text-text">
          Design primitives
        </h1>
        <p className="mt-2 text-sm text-text-muted font-body">
          Dev-only surface. Not shipped in production.
        </p>
      </header>
      <PrimitivesShowcase />
    </div>
  );
}
