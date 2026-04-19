"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export function FinalCta() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    // Navigate to signup with email prefilled
    router.push(`/signup?email=${encodeURIComponent(email)}&source=landing_cta`);
    setDone(true);
  }

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
            Your first page
            <br />
            <span className="text-accent">is free.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[400px] font-body text-base font-light leading-relaxed text-text-muted">
            No account needed to start. Just describe what you need.
          </p>

          <div className="mx-auto mt-10 max-w-[440px]">
            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[14px] border border-accent-bold bg-accent-light px-6 py-5 font-display text-base font-semibold text-accent"
              >
                ✓ You&apos;re in — check your inbox.
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className={cn(
                  "input-focus-ring flex overflow-hidden rounded-[14px] border border-border bg-surface",
                  "shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
                )}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="min-w-0 flex-1 bg-transparent px-5 py-4 font-body text-base text-text outline-none placeholder:text-text-muted/50"
                  required
                />
                <button
                  type="submit"
                  className={cn(
                    "shrink-0 border-l border-border bg-text px-6 py-4",
                    "font-display text-[13px] font-bold tracking-tight text-bg",
                    "transition-opacity hover:opacity-80 active:scale-[0.98]",
                  )}
                >
                  Start free →
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 font-body text-xs text-text-muted/50">
            No credit card&nbsp;·&nbsp;No setup&nbsp;·&nbsp;Cancel anytime
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup?source=landing_cta"
              className="font-body text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Create account →
            </Link>
            <Link
              href="/pricing"
              className="font-body text-sm font-medium text-text-muted underline-offset-4 hover:underline"
            >
              See pricing
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
