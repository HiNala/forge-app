"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";

/** Qualitative highlights only — no unverified counts (Mission FE-02). */
const HIGHLIGHTS = [
  { title: "One sentence in", body: "Describe the page — not a template maze." },
  { title: "Preview while it builds", body: "Watch the layout stream in, then refine in Studio." },
  { title: "A link you can share", body: "Hosted on Forge; add your domain on Pro." },
] as const;

export function StatsSection() {
  return (
    <section className="border-b border-border py-14 sm:py-16" aria-label="Product highlights">
      <Container max="xl">
        <ul className="grid list-none grid-cols-1 gap-y-10 p-0 text-center sm:grid-cols-3 sm:gap-y-0">
          {HIGHLIGHTS.map(({ title, body }, i) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center px-2"
            >
              <p className="font-display text-[clamp(22px,3vw,30px)] font-bold tracking-tight text-text">
                {title}
              </p>
              <p className="mt-2 max-w-[28ch] font-body text-sm font-light leading-relaxed text-text-muted">
                {body}
              </p>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
