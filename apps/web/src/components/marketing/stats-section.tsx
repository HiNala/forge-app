"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";

const STATS = [
  { value: "< 10s", label: "Average build time" },
  { value: "98%", label: "Used without editing" },
  { value: "4,200+", label: "Pages built this week" },
] as const;

export function StatsSection() {
  return (
    <section className="border-b border-border py-14 sm:py-16">
      <Container max="xl">
        <dl className="grid grid-cols-1 gap-y-10 text-center sm:grid-cols-3 sm:gap-y-0">
          {STATS.map(({ value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <dt className="font-display text-[clamp(32px,5vw,56px)] font-bold tracking-tight text-text">
                {value}
              </dt>
              <dd className="mt-1 font-body text-sm font-light text-text-muted">
                {label}
              </dd>
            </motion.div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
