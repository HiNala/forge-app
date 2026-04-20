"use client";

import dynamic from "next/dynamic";

const HeroDemo = dynamic(
  () => import("./hero-demo").then((m) => m.HeroDemo),
  {
    loading: () => (
      <div
        className="mx-auto mt-10 min-h-[280px] max-w-2xl rounded-2xl border border-dashed border-border bg-bg-elevated/40 lg:mt-12"
        aria-hidden
      />
    ),
    ssr: false,
  },
);

export function HeroDemoLazy() {
  return <HeroDemo />;
}
