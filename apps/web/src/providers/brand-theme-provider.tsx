"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getBrand } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

function accentVars(primary: string | null | undefined): React.CSSProperties {
  if (!primary) return {};
  const p = primary.trim();
  return {
    ["--accent" as string]: p,
    ["--accent-light" as string]: `color-mix(in srgb, ${p} 12%, transparent)`,
    ["--accent-mid" as string]: `color-mix(in srgb, ${p} 22%, transparent)`,
    ["--accent-bold" as string]: `color-mix(in srgb, ${p} 34%, transparent)`,
  } as React.CSSProperties;
}

function enc(name: string): string {
  return encodeURIComponent(name).replace(/%20/g, "+");
}

function fontHref(displayFont: string | null, bodyFont: string | null): string | null {
  const d = displayFont?.trim();
  const b = bodyFont?.trim();
  if (!d && !b) return null;
  if (d && !b) {
    return `https://fonts.googleapis.com/css2?family=${enc(d)}:wght@400;600&display=swap`;
  }
  if (!d && b) {
    return `https://fonts.googleapis.com/css2?family=${enc(b)}:wght@400;500;600&display=swap`;
  }
  if (d && b && d === b) {
    return `https://fonts.googleapis.com/css2?family=${enc(d)}:wght@400;500;600&display=swap`;
  }
  if (d && b) {
    return `https://fonts.googleapis.com/css2?family=${enc(d)}:wght@400;600&family=${enc(b)}:wght@400;500;600&display=swap`;
  }
  return null;
}

/**
 * Tenant-scoped brand tokens for the authenticated app shell (not generated pages).
 */
export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { activeOrganizationId, isLoading: sessionLoading } = useForgeSession();

  const { data: brand } = useQuery({
    queryKey: ["brand", activeOrganizationId],
    enabled: !!activeOrganizationId && !sessionLoading,
    staleTime: 60 * 1000,
    queryFn: () => getBrand(getToken, activeOrganizationId),
  });

  const href = React.useMemo(
    () => fontHref(brand?.display_font ?? null, brand?.body_font ?? null),
    [brand?.display_font, brand?.body_font],
  );

  React.useEffect(() => {
    if (!href || typeof document === "undefined") return;
    const id = "forge-tenant-google-fonts";
    let el = document.getElementById(id) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement("link");
      el.id = id;
      el.rel = "stylesheet";
      document.head.appendChild(el);
    }
    if (el.href !== href) el.href = href;
  }, [href]);

  const df = brand?.display_font?.trim() || null;
  const bf = brand?.body_font?.trim() || null;

  const style = React.useMemo(
    () =>
      ({
        ...accentVars(brand?.primary_color),
        ...(df
          ? { ["--forge-font-display" as string]: `"${df}", ui-serif, Georgia, "Times New Roman", serif` }
          : {}),
        ...(bf
          ? { ["--forge-font-body" as string]: `"${bf}", ui-sans-serif, system-ui, sans-serif` }
          : {}),
      }) as React.CSSProperties,
    [brand?.primary_color, df, bf],
  );

  return (
    <div data-forge-tenant className="min-h-full" style={style}>
      {children}
    </div>
  );
}
