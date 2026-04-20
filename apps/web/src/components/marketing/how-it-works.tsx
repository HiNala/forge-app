"use client";

import { motion } from "framer-motion";
import { PenLine, Share2, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    title: "Describe it.",
    body: "Type what you need. No templates to pick from unless you want one.",
    Icon: PenLine,
  },
  {
    n: "02",
    title: "See it built.",
    body: "Forge generates a branded page in seconds. Refine by clicking any section.",
    Icon: Sparkles,
  },
  {
    n: "03",
    title: "Share the link.",
    body: "Publish, paste the URL into your website or email, done.",
    Icon: Share2,
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
      <Container max="xl">
        <div className="mb-14">
          <span className="section-label">How it works</span>
          <h2 className="mt-2.5 font-display text-[clamp(28px,3.5vw,46px)] font-bold leading-[1] tracking-tight text-text">
            Three steps. One result.
          </h2>
        </div>

        <ul className="list-none p-0 sm:flex">
          {STEPS.map((step, i) => {
            const Icon = step.Icon;
            return (
              <motion.li
                key={step.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-8%" }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "flex-1 border border-border bg-surface p-8 sm:p-9",
                  i === 0 && "rounded-t-[16px] sm:rounded-l-[16px] sm:rounded-tr-none",
                  i === 1 && "border-t-0 sm:border-t sm:border-l-0",
                  i === 2 &&
                    "rounded-b-[16px] border-t-0 sm:rounded-r-[16px] sm:rounded-bl-none sm:border-t sm:border-l-0",
                )}
                style={{ marginLeft: i > 0 ? "-1px" : undefined }}
              >
                <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-accent-light text-accent">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </div>
                <p className="mb-4 font-display text-[52px] font-bold leading-none tracking-tight text-text/[0.07]">
                  {step.n}
                </p>
                <h3 className="mb-2.5 font-display text-[18px] font-bold text-text">{step.title}</h3>
                <p className="font-body text-sm font-light leading-[1.75] text-text-muted">{step.body}</p>
              </motion.li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
