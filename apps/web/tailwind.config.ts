import type { Config } from "tailwindcss";

/**
 * Tailwind v4: most design tokens live in `src/app/globals.css` (`@theme inline`, `@custom-variant dark`).
 * This file satisfies Mission F01 (`darkMode: class`, shared `content` paths) and keeps editor/tooling aligned.
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
} satisfies Config;
