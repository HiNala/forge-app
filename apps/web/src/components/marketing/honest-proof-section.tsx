"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";

/**
 * No fabricated testimonials (Mission FE-02). Proof is the live hero demo + examples.
 */
export function HonestProofSection() {
  return (
    <section className="border-t border-border py-16 sm:py-20" aria-labelledby="proof-heading">
      <Container max="xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[52ch] rounded-2xl border border-border bg-surface px-8 py-12 text-center sm:px-12"
        >
          <h2
            id="proof-heading"
            className="font-display text-[clamp(22px,2.8vw,32px)] font-bold leading-snug tracking-tight text-text"
          >
            Proof over hype.
          </h2>
          <p className="mt-4 font-body text-sm font-light leading-relaxed text-text-muted">
            We don&apos;t quote customers we haven&apos;t shipped for yet. Scroll up and run the live demo, or open a
            real example — that&apos;s what Forge is.
          </p>
          <Link
            href="/examples"
            className="mt-8 inline-flex min-h-11 items-center justify-center font-body text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            See example pages →
          </Link>
        </motion.div>
      </Container>
    </section>
  );
}
