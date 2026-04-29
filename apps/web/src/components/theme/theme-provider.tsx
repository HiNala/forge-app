"use client";

import * as React from "react";

type ThemeId = "glidedesign-light" | "glidedesign-dark";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readPreferredTheme(): ThemeId {
  if (typeof window === "undefined") return "glidedesign-light";
  try {
    const saved = localStorage.getItem("glidedesign-theme") as ThemeId | null;
    if (saved === "glidedesign-dark" || saved === "glidedesign-light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "glidedesign-dark"
      : "glidedesign-light";
  } catch {
    return "glidedesign-light";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeId>(() => readPreferredTheme());

  const applyTheme = React.useCallback((next: ThemeId) => {
    const root = document.documentElement;
    root.dataset.theme = next;
    root.classList.toggle("dark", next === "glidedesign-dark");
    root.classList.toggle("theme-glidedesign-light", next === "glidedesign-light");
    root.classList.toggle("theme-glidedesign-dark", next === "glidedesign-dark");
    try {
      localStorage.setItem("glidedesign-theme", next);
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = React.useCallback(
    (next: ThemeId) => {
      setThemeState(next);
    },
    [],
  );

  React.useLayoutEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setTheme(theme === "glidedesign-dark" ? "glidedesign-light" : "glidedesign-dark");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTheme, theme]);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    return { theme: "glidedesign-light", setTheme: () => undefined };
  }
  return ctx;
}
