"use client";

import { motion } from "framer-motion";
import { FileText, MousePointer2, Share2 } from "lucide-react";
import { fadeUp } from "@/lib/motion";
import { Container } from "@/components/ui/container";

const steps = [
  {
    title: "Describe it.",
    body: "Type what you need. No templates to pick from unless you want one.",
    icon: FileText,
  },
  {
    title: "See it built.",
    body:
      "Forge generates a branded page in seconds. Refine by clicking any section in Studio.",
    icon: MousePointer2,
  },
  {
    title: "Share the link.",
    body: "Publish, paste the URL into your website or email, done.",
    icon: Share2,
  },
] as const;

export function HowItWorks() {
  return (
    <section className="border-t border-border bg-bg-elevated py-16 sm:py-20">
      <Container max="xl">
        <h2 className="text-center font-display text-3xl font-semibold text-text sm:text-4xl">
          How it works
        </h2>
        <ul className="mt-12 grid list-none gap-12 p-0 sm:grid-cols-3 sm:gap-10">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-12% 0px" }}
                className="text-center sm:text-left"
              >
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent-light text-accent sm:mx-0">
                  <Icon className="size-6 stroke-[1.75]" aria-hidden />
                </div>
                <span className="mt-4 block font-display text-sm font-semibold text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1 font-display text-xl font-semibold text-text">{step.title}</h3>
                <p className="mt-2 max-w-[65ch] text-pretty text-sm leading-relaxed text-text-muted sm:mx-0 sm:mr-auto">
                  {step.body}
                </p>
              </motion.li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
