"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";

const TESTIMONIALS = [
  {
    quote:
      '"I needed a booking page for my cleaning service on a Saturday afternoon. Forge had it live before I finished my coffee."',
    name: "Rachel M.",
    role: "Owner, SparkClean",
  },
  {
    quote:
      '"My clients kept asking for a way to book online. I tried builders for weeks. Forge did it in one sentence."',
    name: "Tom B.",
    role: "Freelance Electrician",
  },
  {
    quote:
      '"We spin up event landing pages for every local market we run. What used to take days now takes minutes."',
    name: "Priya S.",
    role: "Director, Local Markets Co.",
  },
] as const;

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-20">
      <Container max="xl">
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-3">
          {TESTIMONIALS.map(({ quote, name, role }, i) => (
            <motion.li
              key={name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col rounded-2xl border border-border bg-surface p-7"
            >
              <blockquote className="flex-1 font-body text-sm font-light leading-[1.75] text-text">
                {quote}
              </blockquote>
              <footer className="mt-5 border-t border-border pt-4">
                <p className="font-body text-[13px] font-bold text-text">{name}</p>
                <p className="font-body text-[12px] text-text-muted">{role}</p>
              </footer>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
