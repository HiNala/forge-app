import { Geist, Inter, JetBrains_Mono } from "next/font/google";

// General Sans is the preferred display face in the brand guide. Geist is the
// closest Google-hosted geometric display available through `next/font`.
export const displayFont = Geist({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

/** Technical / monospace — IDs, timestamps, snippets (never chrome headlines). */
export const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mono",
  display: "swap",
});
