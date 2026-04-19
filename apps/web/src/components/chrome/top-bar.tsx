"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Bell, Menu, Search } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useCommandPalette } from "@/contexts/command-palette-context";
import { getNotificationUnreadCount } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { Sidebar } from "@/components/chrome/sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

function breadcrumbFromPath(pathname: string): string[] | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  const labels = parts.map((p) =>
    p.length > 24 ? `${p.slice(0, 21)}…` : p.replace(/-/g, " "),
  );
  return labels.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

/** Hamburger + mobile search; remounted when `pathname` changes so the drawer resets closed without an effect. */
function MobileNavCluster({
  openCommand,
}: {
  openCommand: (open: boolean) => void;
}) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-surface text-text transition-[transform,box-shadow] duration-[80ms] ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.97] md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] border-r p-0 sm:max-w-[240px]">
          <div className="h-full overflow-y-auto">
            <Sidebar
              className="h-full border-0"
              closeMobileNav={() => setMobileNavOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-surface text-text transition-[transform,box-shadow] duration-[80ms] ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.97] md:hidden"
        aria-label="Open search and commands"
        onClick={() => openCommand(true)}
      >
        <Search className="size-5" aria-hidden />
      </button>
    </>
  );
}

export function TopBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = breadcrumbFromPath(pathname);
  const { setOpen: openCommand } = useCommandPalette();
  const [notifOpen, setNotifOpen] = React.useState(false);
  const { getToken } = useAuth();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { activeOrganizationId } = useForgeSession();

  const unread = useQuery({
    queryKey: ["notifications-unread", activeOrganizationId],
    queryFn: () => getNotificationUnreadCount(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
    staleTime: 60 * 1000,
  });

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg/90 px-3 backdrop-blur-sm md:px-6",
        className,
      )}
    >
      {isMobile ? (
        <MobileNavCluster key={pathname} openCommand={openCommand} />
      ) : null}

      <div className="min-w-0 flex-1">
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="truncate font-body text-sm text-text-muted">
            {crumbs.map((c, i) => (
              <span key={`${c}-${i}`}>
                {i > 0 ? <span className="mx-1.5 text-text-subtle">/</span> : null}
                <span className={i === crumbs.length - 1 ? "font-medium text-text" : ""}>
                  {c}
                </span>
              </span>
            ))}
          </nav>
        ) : (
          <span className="sr-only">Application</span>
        )}
      </div>

      <div className="mx-auto hidden max-w-[480px] flex-1 md:block">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-subtle"
            aria-hidden
          />
          <Input
            readOnly
            aria-label="Open command palette"
            placeholder="Search pages, submissions, people (⌘K)"
            className="h-10 cursor-pointer pl-9"
            onFocus={() => openCommand(true)}
            onClick={() => openCommand(true)}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative rounded-md p-2 text-text-muted hover:bg-bg-elevated hover:text-text"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {(unread.data?.count ?? 0) > 0 ? (
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />
              ) : null}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                Automation and ops alerts will land here. Full history comes in a later
                release.
              </SheetDescription>
            </SheetHeader>
            <p className="mt-6 text-sm text-text-muted font-body">
              You&apos;re all caught up for the last 24 hours.
            </p>
          </SheetContent>
        </Sheet>

      </div>
    </header>
  );
}
