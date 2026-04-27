"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LayoutDashboard,
  PlusCircle,
  Settings,
  Shield,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { ForgeMark } from "@/components/chrome/forge-logo";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getBillingUsage,
  listPages,
  patchUserPreferences,
  postAuthSignOut,
  postCreateWorkspace,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useForgeSession } from "@/providers/session-provider";
import {
  SIDEBAR_COLLAPSED_PX,
  SIDEBAR_EXPANDED_PX,
  useUIStore,
} from "@/stores/ui";

const SIDEBAR_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SIDEBAR_MS = "240ms";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio", label: "Studio", icon: PlusCircle, primary: true as const },
  { href: "/studio/mobile", label: "Mobile design", icon: Smartphone },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings/profile", label: "Settings", icon: Settings },
] as const;

/** Plan usage: submissions quota when set, else pages generated (Mission 06). */
function OrgQuotaBar({
  collapsed,
  getToken,
  activeOrgId,
}: {
  collapsed: boolean;
  getToken: () => Promise<string | null>;
  activeOrgId: string | null;
}) {
  const q = useQuery({
    queryKey: ["billing-usage", activeOrgId],
    queryFn: () => getBillingUsage(getToken, activeOrgId),
    enabled: !!activeOrgId,
    staleTime: 60_000,
  });
  const u = q.data;
  if (!u) return null;
  const useSubs = u.submissions_quota > 0;
  const cap = useSubs ? u.submissions_quota : u.pages_quota;
  const used = useSubs ? u.submissions_received : u.pages_generated;
  if (cap <= 0) return null;
  const ratio = Math.min(1, used / cap);
  const pct = ratio * 100;
  const barClass =
    pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-accent";
  const label = useSubs
    ? `${used}/${cap} submissions this month`
    : `${used}/${cap} pages this month`;

  const inner = (
    <Link
      href="/settings/billing"
      className={cn(
        "block w-full rounded-md px-1 py-2 text-left transition-colors hover:bg-bg-elevated/60",
        collapsed && "px-0 py-1.5",
      )}
      aria-label={label}
    >
      {!collapsed ? (
        <p className="mb-1 text-[10px] font-medium tracking-wide text-text-subtle uppercase">
          Plan usage
        </p>
      ) : null}
      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all", barClass)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {!collapsed ? (
        <p className="mt-1 truncate text-[11px] text-text-muted">{label}</p>
      ) : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px]">
          {label} — Billing
        </TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

function navLinkActive(pathname: string, href: string): boolean {
  if (href === "/settings/profile") return pathname.startsWith("/settings");
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/studio") return pathname === "/studio";
  if (href === "/studio/mobile") {
    return pathname === "/studio/mobile" || pathname.startsWith("/studio/mobile/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  Icon,
  primary,
  collapsed,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  primary?: boolean;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const active = navLinkActive(pathname, href);
  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md py-2 pr-2 pl-3 text-sm font-medium font-body",
        "transition-[background-color,color,opacity] duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        primary &&
          "shadow-sm ring-1 ring-accent/20 bg-accent-light/40 font-semibold",
        active && !primary
          ? "bg-accent-light text-accent"
          : !active && "text-text-muted hover:bg-bg-elevated/80 hover:text-text",
        active &&
          !primary &&
          "before:absolute before:top-1 before:bottom-1 before:left-0 before:w-0.5 before:rounded-full before:bg-accent",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-[18px] shrink-0 text-accent" aria-hidden />
      <span
        className={cn(
          "truncate transition-opacity duration-[120ms]",
          collapsed ? "sr-only" : "inline",
        )}
      >
        {label}
      </span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function RecentPagesList({
  getToken,
  activeOrganizationId,
}: {
  getToken: () => Promise<string | null>;
  activeOrganizationId: string | null;
}) {
  const q = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
    staleTime: 60_000,
  });
  const pages = (q.data ?? []).slice(0, 4);
  if (pages.length === 0) return null;

  return (
    <div className="mt-4">
      <p
        className="px-2.5 pb-1.5 font-body"
        style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-subtle)" }}
      >
        Recent
      </p>
      {pages.map((p) => (
        <Link
          key={p.id}
          href={`/pages/${p.id}`}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 font-body text-[12px] text-text-muted transition-colors hover:bg-bg-elevated/80 hover:text-text"
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{
              background: p.status === "live" ? "var(--color-success)" : "var(--color-warning)",
            }}
          />
          <span className="truncate">{p.title}</span>
        </Link>
      ))}
    </div>
  );
}

export function Sidebar({
  className,
  closeMobileNav,
}: {
  className?: string;
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
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function onCreateWorkspace() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const org = await postCreateWorkspace(() => getToken(), { name });
      setCreateOpen(false);
      setNewName("");
      setWorkspaceOpen(false);
      await setActiveOrganizationId(String(org.id), {
        navigateTo: "/onboarding",
      });
      closeMobileNav?.();
      toast.success("Workspace created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create workspace");
    } finally {
      setCreating(false);
    }
  }

  async function onSignOut() {
    try {
      await postAuthSignOut(() => getToken());
    } catch {
      /* best-effort */
    }
    await signOut({ redirectUrl: "/signin" });
  }

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-border bg-surface",
        className,
      )}
      style={{
        width,
        transition: `width ${SIDEBAR_MS} ${SIDEBAR_EASE}`,
      }}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-[120ms]",
          collapsed ? "opacity-95" : "opacity-100",
        )}
      >
        {/* Workspace switcher — top */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2 border-b border-border px-3",
            collapsed && "justify-center px-2",
          )}
        >
          <DropdownMenu open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-2 pl-1 text-left outline-none ring-offset-bg focus-visible:ring-2 focus-visible:ring-accent-mid",
                  collapsed && "flex-none justify-center p-1.5",
                )}
                aria-label="Workspace switcher"
              >
                <ForgeMark className="size-8 shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1 truncate font-display text-base font-bold tracking-tight text-text">
                      {activeOrg?.organization_name ?? "Workspace"}
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 text-text-subtle" aria-hidden />
                  </>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start" className="min-w-64">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {memberships.map((m) => (
                <DropdownMenuItem
                  key={m.organization_id}
                  className="flex cursor-pointer items-start gap-2 font-body"
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
                    <Badge variant="count" className="mt-0.5 text-[10px] capitalize">
                      {m.role.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {m.organization_id === activeOrganizationId ? (
                    <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 font-body"
                onSelect={(e) => {
                  e.preventDefault();
                  setCreateOpen(true);
                }}
              >
                <PlusCircle className="size-4" />
                Create workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Primary">
          {NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              primary={"primary" in item && item.primary}
              collapsed={collapsed}
            />
          ))}
          {user?.is_platform_admin ? (
            <NavItem
              href="/admin/overview"
              label="Admin"
              Icon={Shield}
              collapsed={collapsed}
            />
          ) : null}
          {!collapsed && (
            <RecentPagesList
              getToken={getToken}
              activeOrganizationId={activeOrganizationId}
            />
          )}
        </nav>

        <div className="shrink-0 border-t border-border px-2 pt-2 pb-1">
          <OrgQuotaBar collapsed={collapsed} getToken={getToken} activeOrgId={activeOrganizationId} />
        </div>

        <div className="mt-auto shrink-0 space-y-2 border-t border-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm",
                  "hover:bg-bg-elevated/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-mid",
                  collapsed && "justify-center",
                )}
                aria-label="Account menu"
              >
                <Avatar
                  name={user?.display_name ?? user?.email ?? "User"}
                  src={user?.avatar_url ?? null}
                  size="sm"
                />
                {!collapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text font-body">
                      {user?.display_name ?? user?.email ?? "Account"}
                    </p>
                    <p className="truncate text-xs text-text-muted font-body">{user?.email}</p>
                  </div>
                ) : null}
                {!collapsed ? (
                  <ChevronsUpDown className="size-4 shrink-0 text-text-subtle" aria-hidden />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="min-w-56">
              <DropdownMenuLabel className="font-normal text-text-muted">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">Profile settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/usage">Usage</Link>
              </DropdownMenuItem>
              {user?.is_platform_admin ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin/overview" className="text-danger">
                      Admin panel
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger font-body"
                onSelect={() => void onSignOut()}
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
          "transition-[transform,box-shadow] duration-[80ms] hover:shadow-lg active:scale-[0.97]",
          "text-text-muted hover:text-text",
        )}
        style={{ transitionTimingFunction: SIDEBAR_EASE }}
      >
        {collapsed ? (
          <ChevronRight className="size-4" style={{ transition: `transform ${SIDEBAR_MS} ${SIDEBAR_EASE}` }} aria-hidden />
        ) : (
          <ChevronLeft className="size-4" aria-hidden />
        )}
      </button>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="ws-new">Workspace name</Label>
            <Input
              id="ws-new"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Acme team"
              onKeyDown={(e) => {
                if (e.key === "Enter") void onCreateWorkspace();
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={creating} onClick={() => void onCreateWorkspace()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
