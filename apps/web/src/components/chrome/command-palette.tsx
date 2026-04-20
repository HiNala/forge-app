"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BarChart3,
  CalendarClock,
  CreditCard,
  FileSignature,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Plus,
  Presentation,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCommandPalette } from "@/contexts/command-palette-context";
import { getTeamMembers, listPages, type MemberOut, type PageOut } from "@/lib/api";
import { pushCmdkRecent, readCmdkRecent, type CmdkRecentItem } from "@/lib/cmdk-recent";
import { useForgeSession } from "@/providers/session-provider";

const NAV_CORE = [
  { href: "/dashboard", label: "Dashboard", value: "dashboard", icon: LayoutDashboard },
  { href: "/pages", label: "Pages", value: "pages list", icon: FileText },
  { href: "/studio", label: "Studio — create a page", value: "studio new page", icon: Sparkles },
  { href: "/analytics", label: "Analytics", value: "analytics org", icon: BarChart3 },
  { href: "/templates", label: "Templates", value: "templates", icon: LayoutTemplate },
] as const;

const SETTINGS_LINKS = [
  { href: "/settings/profile", label: "Settings — Profile", value: "profile account" },
  { href: "/settings/workspace", label: "Settings — Workspace", value: "workspace slug" },
  { href: "/settings/brand", label: "Settings — Brand", value: "brand kit logo" },
  { href: "/settings/team", label: "Settings — Team", value: "team invite members" },
  { href: "/settings/billing", label: "Settings — Billing", value: "billing plan stripe" },
  { href: "/settings/integrations", label: "Settings — Integrations", value: "integrations calendar" },
  { href: "/settings/notifications", label: "Settings — Notifications", value: "notifications email" },
] as const;

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2.5 text-text aria-selected:bg-accent-light";

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const recent = React.useMemo((): CmdkRecentItem[] => (open ? readCmdkRecent() : []), [open]);

  const pagesQ = useQuery({
    queryKey: ["cmdk", "pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: open && !!activeOrganizationId,
    staleTime: 30_000,
  });

  const teamQ = useQuery({
    queryKey: ["cmdk", "team", activeOrganizationId],
    queryFn: () => getTeamMembers(getToken, activeOrganizationId),
    enabled: open && !!activeOrganizationId,
    staleTime: 60_000,
  });

  const run = React.useCallback(
    (href: string, label: string) => {
      pushCmdkRecent({ href, label });
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  const pages = pagesQ.data ?? [];
  const members: MemberOut[] = teamQ.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg" showClose={false} aria-describedby="cmdk-desc">
        <div id="cmdk-desc" className="sr-only">
          Search pages, team, settings, and navigation. Use arrow keys to move and Enter to open.
        </div>
        <h2 className="sr-only">Command palette</h2>
        <Command className="rounded-2xl bg-surface font-body" shouldFilter>
          <div className="border-b border-border px-3 py-2">
            <Command.Input
              placeholder="Search pages, people, settings…"
              className="w-full rounded-md border border-transparent bg-bg-elevated/60 px-3 py-2 text-sm text-text outline-none transition-[box-shadow] duration-[var(--duration-fast)] placeholder:text-text-subtle focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-light)] focus:ring-0"
            />
          </div>
          <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2 text-sm">
            <Command.Empty className="py-8 text-center text-sm text-text-muted">
              No matches — try a page title, email, or setting name.
            </Command.Empty>

            {!activeOrganizationId ? (
              <div className="px-2 py-4 text-center text-xs text-text-muted">
                Choose a workspace to search pages and people.
              </div>
            ) : null}

            {recent.length > 0 ? (
              <Command.Group heading="Recent">
                {recent.map((r) => (
                  <Command.Item
                    key={r.href}
                    value={`${r.label} ${r.href} recent`}
                    onSelect={() => run(r.href, r.label)}
                    className={itemClass}
                  >
                    <FileText className="size-4 text-accent" aria-hidden />
                    {r.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group
              heading="Navigate"
              className="mt-1 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            {NAV_CORE.map(({ href, label, value, icon: Icon }) => (
              <Command.Item
                key={href}
                value={value}
                onSelect={() => run(href, label)}
                className={itemClass}
              >
                <Icon className="size-4 text-accent" aria-hidden />
                {label}
              </Command.Item>
            ))}
            <Command.Group
              heading="Workflows"
              className="mt-2 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            <Command.Item
              value="new contact form studio workflow"
              onSelect={() => run("/studio?workflow=contact_form", "New contact form")}
              className={itemClass}
            >
              <CalendarClock className="size-4 text-teal-600" aria-hidden />
              New contact form
            </Command.Item>
            <Command.Item
              value="new proposal studio workflow"
              onSelect={() => run("/studio?workflow=proposal", "New proposal")}
              className={itemClass}
            >
              <FileSignature className="size-4 text-amber-600" aria-hidden />
              New proposal
            </Command.Item>
            <Command.Item
              value="new pitch deck studio workflow"
              onSelect={() => run("/studio?workflow=pitch_deck", "New pitch deck")}
              className={itemClass}
            >
              <Presentation className="size-4 text-indigo-600" aria-hidden />
              New pitch deck
            </Command.Item>
            <Command.Item
              value="find proposals dashboard filter"
              onSelect={() => run("/dashboard?workflow=proposal", "Proposals — dashboard")}
              className={itemClass}
            >
              <FileText className="size-4 text-accent" aria-hidden />
              Find my proposals
            </Command.Item>
            <Command.Item
              value="settings"
              onSelect={() => run("/settings/profile", "Settings")}
              className={itemClass}
            >
              <Settings className="size-4 text-accent" aria-hidden />
              Settings
            </Command.Item>

            <Command.Group
              heading="Settings"
              className="mt-2 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            {SETTINGS_LINKS.map((s) => (
              <Command.Item
                key={s.href}
                value={s.value}
                onSelect={() => run(s.href, s.label)}
                className={itemClass}
              >
                <Settings className="size-4 shrink-0 text-accent/80" aria-hidden />
                <span className="truncate">{s.label}</span>
              </Command.Item>
            ))}

            <Command.Group
              heading="Pages"
              className="mt-2 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            {pagesQ.isLoading ? (
              <div className="px-2 py-2 text-xs text-text-muted">Loading pages…</div>
            ) : null}
            {pages.map((p: PageOut) => (
              <Command.Item
                key={p.id}
                value={`${p.title} ${p.slug} ${p.page_type} page`}
                onSelect={() => run(`/pages/${p.id}`, p.title)}
                className={itemClass}
              >
                <FileText className="size-4 text-accent" aria-hidden />
                <span className="min-w-0 truncate">{p.title}</span>
                <span className="ml-auto shrink-0 text-[11px] text-text-subtle">{p.slug}</span>
              </Command.Item>
            ))}
            {!pagesQ.isLoading && pages.length === 0 && activeOrganizationId ? (
              <div className="px-2 py-2 text-xs text-text-muted">No pages yet — open Studio to create one.</div>
            ) : null}

            <Command.Group
              heading="Team"
              className="mt-2 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            {teamQ.isLoading ? (
              <div className="px-2 py-2 text-xs text-text-muted">Loading team…</div>
            ) : null}
            {members.map((m) => (
              <Command.Item
                key={m.id}
                value={`${m.display_name ?? ""} ${m.email} ${m.role}`}
                onSelect={() => run("/settings/team", `Team — ${m.email}`)}
                className={itemClass}
              >
                <Users className="size-4 text-accent" aria-hidden />
                <span className="min-w-0 truncate">{m.display_name || m.email}</span>
                <span className="ml-auto shrink-0 text-[11px] text-text-subtle">{m.role}</span>
              </Command.Item>
            ))}

            <Command.Group
              heading="Actions"
              className="mt-2 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            <Command.Item
              value="create page action"
              onSelect={() => run("/studio", "Create page")}
              className={itemClass}
            >
              <Plus className="size-4" aria-hidden />
              Create page
            </Command.Item>
            <Command.Item value="invite teammate" onSelect={() => run("/settings/team", "Invite teammate")} className={itemClass}>
              <Users className="size-4" aria-hidden />
              Invite teammate
            </Command.Item>
            <Command.Item
              value="billing plan upgrade"
              onSelect={() => run("/settings/billing", "Billing")}
              className={itemClass}
            >
              <CreditCard className="size-4" aria-hidden />
              View billing
            </Command.Item>

            <Command.Group
              heading="Workflows"
              className="mt-2 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            <Command.Item
              value="new contact form studio workflow"
              onSelect={() =>
                run("/studio?workflow=contact-form", "New contact form")
              }
              className={itemClass}
            >
              <CalendarClock className="size-4 text-accent" aria-hidden />
              New contact form
            </Command.Item>
            <Command.Item
              value="new proposal studio workflow"
              onSelect={() => run("/studio?workflow=proposal", "New proposal")}
              className={itemClass}
            >
              <FileSignature className="size-4 text-accent" aria-hidden />
              New proposal
            </Command.Item>
            <Command.Item
              value="new pitch deck studio workflow"
              onSelect={() => run("/studio?workflow=pitch-deck", "New pitch deck")}
              className={itemClass}
            >
              <Presentation className="size-4 text-accent" aria-hidden />
              New pitch deck
            </Command.Item>
            <Command.Item
              value="find proposals dashboard filter"
              onSelect={() => run("/dashboard?workflow=proposal", "Proposals on Dashboard")}
              className={itemClass}
            >
              <FileText className="size-4 text-accent" aria-hidden />
              Find my proposals
            </Command.Item>
            <Command.Item
              value="decks no views analytics"
              onSelect={() => run("/analytics?range=30d", "Analytics — deck activity")}
              className={itemClass}
            >
              <BarChart3 className="size-4 text-accent" aria-hidden />
              Deck analytics
            </Command.Item>
          </Command.List>
          <div className="border-t border-border px-3 py-2 text-[11px] text-text-subtle">
            <kbd className="rounded border border-border bg-bg-elevated px-1">esc</kbd> to close ·{" "}
            <kbd className="rounded border border-border bg-bg-elevated px-1">⌘K</kbd> /{" "}
            <kbd className="rounded border border-border bg-bg-elevated px-1">Ctrl K</kbd> to toggle ·{" "}
            <kbd className="rounded border border-border bg-bg-elevated px-1">?</kbd> shortcuts
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
