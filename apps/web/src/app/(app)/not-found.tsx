import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="font-display text-2xl font-semibold text-text">We couldn&apos;t find that page.</p>
      <p className="mt-2 max-w-sm text-sm text-text-muted font-body">
        The link may be wrong, or the page was removed. Head back to your dashboard to keep working.
      </p>
      <Button asChild variant="primary" className="mt-8">
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
