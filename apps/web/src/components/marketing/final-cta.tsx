import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function FinalCta() {
  return (
    <section className="border-t border-border py-20 sm:py-24">
      <Container max="xl" className="text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl md:text-5xl">
          Your next page is a sentence away.
        </h2>
        <div className="mt-10 flex justify-center">
          <Button asChild size="lg" className="min-h-12 px-10">
            <Link href="/signup?source=landing_footer">Start free</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-text-muted font-body">
          No credit card for the trial on Starter.
        </p>
      </Container>
    </section>
  );
}
