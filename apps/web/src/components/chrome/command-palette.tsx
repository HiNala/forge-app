"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCommandPalette } from "@/contexts/command-palette-context";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();

  const run = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg" showClose={false}>
        <Command className="rounded-[10px] bg-surface font-body">
          <div className="border-b border-border px-3 py-2">
            <Command.Input
              placeholder="Search pages, submissions, people…"
              className="w-full rounded-md border border-transparent bg-bg-elevated/60 px-3 py-2 text-sm text-text outline-none placeholder:text-text-subtle focus:border-accent focus:ring-1 focus:ring-accent-mid"
            />
          </div>
          <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2 text-sm">
            <Command.Empty className="py-8 text-center text-text-muted">
              No matches.
            </Command.Empty>

            <Command.Group
              heading="Navigate"
              className="px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            <Command.Item
              value="dashboard"
              onSelect={() => run("/dashboard")}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-text",
                "aria-selected:bg-accent-light",
              )}
            >
              <LayoutDashboard className="size-4 text-accent" />
              Dashboard
            </Command.Item>
            <Command.Item
              value="pages"
              onSelect={() => run("/pages")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-text aria-selected:bg-accent-light"
            >
              <FileText className="size-4 text-accent" />
              Pages
            </Command.Item>
            <Command.Item
              value="studio"
              onSelect={() => run("/studio")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 aria-selected:bg-accent-light"
            >
              <Sparkles className="size-4 text-accent" />
              Studio
            </Command.Item>
            <Command.Item
              value="analytics"
              onSelect={() => run("/analytics")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 aria-selected:bg-accent-light"
            >
              <BarChart3 className="size-4 text-accent" />
              Analytics
            </Command.Item>
            <Command.Item
              value="templates"
              onSelect={() => run("/templates")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 aria-selected:bg-accent-light"
            >
              <LayoutTemplate className="size-4 text-accent" />
              Templates
            </Command.Item>
            <Command.Item
              value="settings"
              onSelect={() => run("/settings")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 aria-selected:bg-accent-light"
            >
              <Settings className="size-4 text-accent" />
              Settings
            </Command.Item>
            <Command.Item
              value="billing settings"
              onSelect={() => run("/settings/billing")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 aria-selected:bg-accent-light"
            >
              <CreditCard className="size-4 text-accent" />
              Billing
            </Command.Item>

            <Command.Group
              heading="Pages"
              className="mt-2 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            <Command.Item
              value="pages-placeholder"
              disabled
              className="rounded-md px-2 py-2 text-text-muted"
            >
              Pages from your workspace appear here (Mission F03).
            </Command.Item>

            <Command.Group
              heading="Actions"
              className="mt-2 px-1 py-1 text-xs font-semibold text-text-subtle uppercase tracking-wide"
            />
            <Command.Item
              value="create page"
              onSelect={() => run("/studio")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 aria-selected:bg-accent-light"
            >
              <Plus className="size-4" />
              Create page
            </Command.Item>
            <Command.Item
              value="invite"
              onSelect={() => run("/settings")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 aria-selected:bg-accent-light"
            >
              <Users className="size-4" />
              Invite teammate
            </Command.Item>
            <Command.Item
              value="docs"
              onSelect={() =>
                window.open("https://github.com", "_blank", "noopener,noreferrer")
              }
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 aria-selected:bg-accent-light"
            >
              <FileText className="size-4" />
              Open docs
            </Command.Item>
          </Command.List>
          <div className="border-t border-border px-3 py-2 text-[11px] text-text-subtle">
            <kbd className="rounded border border-border bg-bg-elevated px-1">esc</kbd> to close ·{" "}
            <kbd className="rounded border border-border bg-bg-elevated px-1">⌘K</kbd> /{" "}
            <kbd className="rounded border border-border bg-bg-elevated px-1">Ctrl K</kbd> to toggle
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
