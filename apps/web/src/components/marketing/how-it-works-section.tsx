"use client";

import { motion, useReducedMotion } from "framer-motion";

import { fadeUp } from "@/lib/motion";

const steps = [
  {
    title: "Describe it.",
    body: "Type what you need. No template picker unless you want one.",
  },
  {
    title: "See it built.",
    body: "Forge generates a branded page in seconds. Refine by clicking any section in Studio.",
  },
  {
    title: "Share the link.",
    body: "Publish, paste the URL into email or your site, and you are done.",
  },
] as const;

export function HowItWorksSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="border-t border-border bg-bg-elevated py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="font-display text-center text-3xl font-bold text-text sm:text-4xl">
          How it works
        </h2>
        <ul className="mt-12 grid gap-10 sm:grid-cols-3">
          {steps.map((s, i) => (
            <motion.li
              key={s.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-48px" }}
              transition={{
                duration: reduceMotion ? 0.01 : 0.22,
                delay: reduceMotion ? 0 : i * 0.06,
              }}
              className="text-center sm:text-left"
            >
              <span className="font-display text-sm font-semibold text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-xl font-bold text-text">{s.title}</h3>
              <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-text-muted">
                {s.body}
              </p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
