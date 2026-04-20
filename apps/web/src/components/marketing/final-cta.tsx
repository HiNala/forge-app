"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/** Single primary CTA — no email field (Mission FE-02 Phase 7). */
export function FinalCta() {
  return (
    <section id="cta" className="border-t border-border py-24 sm:py-32">
      <Container max="xl" className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-[clamp(32px,5vw,62px)] font-bold leading-[0.95] tracking-tight text-text">
            Your next page is a sentence away.
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] font-body text-base font-light leading-relaxed text-text-muted">
            Start free — describe what you need, get a hosted page, invite your team when you&apos;re ready.
          </p>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="min-h-12 min-w-[12rem] px-8">
              <Link href="/signup?source=landing_footer">Start free</Link>
            </Button>
          </div>
          <p className="mt-6 font-body text-xs text-text-muted">
            <Link href="/pricing" className="underline-offset-4 hover:underline">
              Compare plans
            </Link>
            <span aria-hidden className="mx-2 text-text-subtle">
              ·
            </span>
            <Link href="/examples" className="underline-offset-4 hover:underline">
              Browse examples
            </Link>
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
