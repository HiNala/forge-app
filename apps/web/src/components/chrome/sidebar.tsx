"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { ForgeMark } from "@/components/chrome/forge-logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { patchUserPreferences } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useForgeSession } from "@/providers/session-provider";
import {
  SIDEBAR_COLLAPSED_PX,
  SIDEBAR_EXPANDED_PX,
  useUIStore,
} from "@/stores/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pages", label: "Pages", icon: FileText },
  { href: "/studio", label: "Studio", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
] as const;

type NavItem = (typeof NAV)[number];

function NavLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const Icon = item.icon;

  return (
    <div className="relative w-full" {...(collapsed ? { "data-tip": item.label } : {})}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-md py-2 pr-2 pl-3 text-sm font-medium font-body",
          "transition-[background-color,color,opacity] duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          active
            ? "bg-accent-light text-accent"
            : "text-text-muted hover:bg-bg-elevated/80 hover:text-text",
          collapsed && "justify-center px-0",
          active &&
            "before:absolute before:top-1 before:bottom-1 before:left-0 before:w-0.5 before:rounded-full before:bg-accent",
        )}
      >
        <Icon className="size-[18px] shrink-0 text-accent" aria-hidden />
        <span
          className={cn(
            "truncate transition-opacity duration-[120ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
            collapsed ? "sr-only" : "inline",
          )}
        >
          {item.label}
        </span>
      </Link>
    </div>
  );
}

export function Sidebar({
  className,
  closeMobileNav,
}: {
  className?: string;
  /** When the sidebar is shown in the mobile sheet, call after actions that do not change the URL (e.g. workspace switch). */
  closeMobileNav?: () => void;
}) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const {
    memberships,
    activeOrg,
    activeOrganizationId,
    setActiveOrganizationId,
    user,
  } = useForgeSession();

  const width = collapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX;

  const persistCollapse = React.useCallback(
    async (next: boolean) => {
      setSidebarCollapsed(next);
      try {
        await patchUserPreferences(() => getToken(), { sidebar_collapsed: next });
      } catch {
        /* offline */
      }
    },
    [getToken, setSidebarCollapsed],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        void persistCollapse(!collapsed);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed, persistCollapse]);

  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);

  const showLeaveWorkspace =
    !!activeOrg &&
    !(
      activeOrg.role.toLowerCase() === "owner" && memberships.length === 1
    );

  function onCreateWorkspaceHint() {
    toast.info("Additional workspaces from the app shell will use the team billing API — coming soon.");
    setWorkspaceOpen(false);
  }

  function onLeaveWorkspace() {
    toast.message("Leave workspace is available once the membership API ships.");
  }

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-border bg-surface",
        "transition-[width] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        className,
      )}
      style={{ width }}
    >
      <div
        className={cn(
          "overflow-hidden transition-opacity duration-[120ms] ease-out",
          collapsed ? "opacity-90" : "opacity-100",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center gap-2 border-b border-border px-3",
            collapsed && "justify-center px-2",
          )}
        >
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2 rounded-md outline-none ring-offset-bg focus-visible:ring-2 focus-visible:ring-accent-mid"
          >
            <ForgeMark className="size-7" />
            {!collapsed && (
              <span className="font-display text-lg font-semibold tracking-tight text-text">
                Forge
              </span>
            )}
          </Link>
        </div>

        <nav className="flex flex-col gap-0.5 p-2" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm font-body",
                  "hover:bg-bg-elevated/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid",
                  collapsed && "justify-center",
                )}
                {...(collapsed ? { "data-tip": "Switch workspace" } : {})}
              >
                <Avatar
                  name={activeOrg?.organization_name ?? "Workspace"}
                  size="sm"
                />
                {!collapsed && (
                  <span className="min-w-0 flex-1 truncate text-left font-medium text-text">
                    {activeOrg?.organization_name ?? "Workspace"}
                  </span>
                )}
                {!collapsed && (
                  <ChevronsUpDown className="size-4 shrink-0 text-text-subtle" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="min-w-56">
              <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
              {memberships.map((m) => (
                <DropdownMenuItem
                  key={m.organization_id}
                  className="flex items-start gap-2 font-body"
                  onSelect={() => {
                    void (async () => {
                      await setActiveOrganizationId(m.organization_id);
                      toast.success(`Switched to ${m.organization_name}`);
                      closeMobileNav?.();
                    })();
                  }}
                >
                  <Avatar className="mt-0.5" name={m.organization_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">{m.organization_name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="archived" className="text-[10px]">
                        Free
                      </Badge>
                      <Badge variant="count" className="text-[10px] capitalize">
                        {m.role.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  {m.organization_id === activeOrganizationId ? (
                    <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <Dialog open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="gap-2 font-body"
                  >
                    <Plus className="size-4" />
                    Create workspace
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New workspace</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-text-muted font-body">
                    Multi-workspace creation for existing accounts is wired in the next backend
                    milestone.
                  </p>
                  <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setWorkspaceOpen(false)}>
                      Close
                    </Button>
                    <Button type="button" onClick={onCreateWorkspaceHint}>
                      OK
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {showLeaveWorkspace ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="font-body text-danger focus:text-danger"
                    onSelect={(e) => {
                      e.preventDefault();
                      onLeaveWorkspace();
                    }}
                  >
                    Leave workspace
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md p-2 text-left",
                  "hover:bg-bg-elevated/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid",
                  collapsed && "justify-center",
                )}
                aria-label="Account menu"
                {...(collapsed ? { "data-tip": "Account" } : {})}
              >
                <Avatar name={user?.display_name ?? user?.email ?? "User"} src={user?.avatar_url ?? null} size="sm" />
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text font-body">
                      {user?.display_name ?? "Account"}
                    </p>
                    <p className="truncate text-xs text-accent font-body">Free</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem asChild>
                <Link href="/settings">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger font-body"
                onSelect={() => signOut({ redirectUrl: "/" })}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void persistCollapse(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "absolute top-16 -right-3 z-20 flex size-7 items-center justify-center rounded-full border border-border bg-surface shadow-md",
          "transition-[transform,box-shadow] duration-[80ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-lg active:scale-[0.97]",
          "text-text-muted hover:text-text",
        )}
      >
        {collapsed ? (
          <ChevronRight className="size-4 transition-transform duration-[220ms]" aria-hidden />
        ) : (
          <ChevronLeft className="size-4 transition-transform duration-[220ms]" aria-hidden />
        )}
      </button>
    </aside>
  );
}
