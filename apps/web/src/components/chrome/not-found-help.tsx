"use client";

import { useAuth, useUser } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPages, listTemplates, type PageOut, type TemplateListItemOut } from "@/lib/api";
import { levenshtein } from "@/lib/levenshtein";
import { useForgeSession } from "@/providers/session-provider";

const NO_PAGES: PageOut[] = [];
const NO_TEMPLATES: TemplateListItemOut[] = [];

const QUICK = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/studio", label: "Studio" },
  { href: "/templates", label: "Templates" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings/profile", label: "Profile" },
] as const;

type Suggestion =
  | { kind: "page"; page: PageOut; score: number }
  | { kind: "template"; template: TemplateListItemOut; score: number };

function lastSegment(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const raw = parts[parts.length - 1] ?? "";
  try {
    return decodeURIComponent(raw).toLowerCase().replace(/[^a-z0-9_-]+/gi, "");
  } catch {
    return raw.toLowerCase().replace(/[^a-z0-9_-]+/gi, "");
  }
}

function suggestFromUrl(pathname: string, pages: PageOut[], templates: TemplateListItemOut[]): Suggestion[] {
  const needle = lastSegment(pathname);
  if (needle.length < 2) return [];

  const out: Suggestion[] = [];
  for (const p of pages) {
    const slug = p.slug.toLowerCase();
    const title = p.title.toLowerCase().replace(/\s+/g, "");
    const score = Math.min(
      levenshtein(needle, slug),
      levenshtein(needle, title),
      slug.includes(needle) ? 0 : 99,
      title.includes(needle) ? 1 : 99,
    );
    if (score <= 3 || slug.includes(needle) || title.includes(needle)) {
      out.push({ kind: "page", page: p, score });
    }
  }
  for (const t of templates) {
    const slug = t.slug.toLowerCase();
    const name = t.name.toLowerCase().replace(/\s+/g, "");
    const score = Math.min(
      levenshtein(needle, slug),
      levenshtein(needle, name),
      slug.includes(needle) ? 0 : 99,
      name.includes(needle) ? 1 : 99,
    );
    if (score <= 3 || slug.includes(needle) || name.includes(needle)) {
      out.push({ kind: "template", template: t, score });
    }
  }
  out.sort((a, b) => a.score - b.score);
  const seen = new Set<string>();
  const dedup: Suggestion[] = [];
  for (const s of out) {
    const key = s.kind === "page" ? `p:${s.page.id}` : `t:${s.template.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(s);
    if (dedup.length >= 5) break;
  }
  return dedup;
}

export function NotFoundHelp() {
  const pathname = usePathname() || "";
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const [q, setQ] = React.useState("");

  const pagesQ = useQuery({
    queryKey: ["not-found", "pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: Boolean(isSignedIn && activeOrganizationId),
    staleTime: 60_000,
  });

  const templatesQ = useQuery({
    queryKey: ["not-found", "templates"],
    queryFn: () => listTemplates(getToken),
    enabled: Boolean(isSignedIn),
    staleTime: 120_000,
  });

  const pages = React.useMemo(() => pagesQ.data ?? NO_PAGES, [pagesQ.data]);
  const templates = React.useMemo(() => templatesQ.data ?? NO_TEMPLATES, [templatesQ.data]);

  const suggestions = React.useMemo(
    () => (isSignedIn ? suggestFromUrl(pathname, pages, templates) : []),
    [isSignedIn, pathname, pages, templates],
  );

  const needle = q.trim().toLowerCase();
  const filteredPages = React.useMemo(() => {
    if (!needle || !isSignedIn) return [];
    return pages
      .filter(
        (p) =>
          p.title.toLowerCase().includes(needle) || p.slug.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [pages, needle, isSignedIn]);

  const filteredTemplates = React.useMemo(() => {
    if (!needle || !isSignedIn) return [];
    return templates
      .filter(
        (t) =>
          t.name.toLowerCase().includes(needle) ||
          t.slug.toLowerCase().includes(needle) ||
          (t.description?.toLowerCase().includes(needle) ?? false),
      )
      .slice(0, 8);
  }, [templates, needle, isSignedIn]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center font-body">
      <Image
        src="/brand/illustrations/not-found-glide.svg"
        alt=""
        aria-hidden
        width={640}
        height={420}
        className="mb-6 h-auto w-full max-w-[320px] drop-shadow-sm"
      />
      <p className="section-label">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        We couldn&apos;t find that page.
      </h1>
      <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-text-muted">
        The link may be wrong, or the page moved.{" "}
        {isSignedIn
          ? "Search below or open a common destination."
          : "Sign in to search your workspace, or use the links below."}
      </p>

      {isSignedIn ? (
        <div className="mt-8 w-full text-start">
          <label className="sr-only" htmlFor="not-found-search">
            Search pages and templates
          </label>
          <Input
            id="not-found-search"
            placeholder="Search pages and templates…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-bg-elevated/60"
            autoComplete="off"
          />
          {(filteredPages.length > 0 || filteredTemplates.length > 0) && (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2 text-sm">
              {filteredPages.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pages/${p.id}`}
                    className="block rounded-md px-2 py-1.5 text-text hover:bg-accent-light"
                  >
                    <span className="font-medium">{p.title}</span>
                    <span className="ms-2 text-text-muted">/{p.slug}</span>
                  </Link>
                </li>
              ))}
              {filteredTemplates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/app-templates?open=${encodeURIComponent(t.id)}`}
                    className="block rounded-md px-2 py-1.5 text-text hover:bg-accent-light"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="ms-2 text-text-muted">template</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {suggestions.length > 0 && !needle ? (
            <div className="mt-6 text-start">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Maybe you meant
              </p>
              <ul className="mt-2 space-y-1">
                {suggestions.map((s) =>
                  s.kind === "page" ? (
                    <li key={`p-${s.page.id}`}>
                      <Link
                        href={`/pages/${s.page.id}`}
                        className="text-sm text-accent hover:underline"
                      >
                        {s.page.title}
                      </Link>
                      <span className="text-text-muted"> — page</span>
                    </li>
                  ) : (
                    <li key={`t-${s.template.id}`}>
                      <Link
                        href={`/app-templates?open=${encodeURIComponent(s.template.id)}`}
                        className="text-sm text-accent hover:underline"
                      >
                        {s.template.name}
                      </Link>
                      <span className="text-text-muted"> — template</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 text-xs text-text-muted">
        {isSignedIn ? (
          <>
            Press{" "}
            <kbd className="rounded border border-border px-1 font-mono text-[0.7rem]">⌘K</kbd> /{" "}
            <kbd className="rounded border border-border px-1 font-mono text-[0.7rem]">Ctrl+K</kbd>{" "}
            for the command palette.
          </>
        ) : (
          <>
            After you sign in, use{" "}
            <kbd className="rounded border border-border px-1 font-mono text-[0.7rem]">⌘K</kbd> /{" "}
            <kbd className="rounded border border-border px-1 font-mono text-[0.7rem]">Ctrl+K</kbd>{" "}
            for the command palette.
          </>
        )}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {QUICK.map((l) => (
          <Button key={l.href} asChild variant="secondary" size="sm">
            <Link href={l.href}>{l.label}</Link>
          </Button>
        ))}
      </div>

      {!isSignedIn ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary">
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Home</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
