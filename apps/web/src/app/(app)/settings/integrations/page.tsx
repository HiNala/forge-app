"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Webhook, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listCalendarConnections } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

type StatusKind = "connected" | "not-connected";

function StatusPill({ kind, label }: { kind: StatusKind; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-body text-[11px] font-semibold",
        kind === "connected" && "border-success/20 bg-success/10 text-success",
        kind === "not-connected" && "border-border/70 bg-bg-elevated/80 text-text-subtle",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          kind === "connected" && "bg-success",
          kind !== "connected" && "bg-border-strong",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}

function IntegrationCard({
  icon: Icon,
  title,
  description,
  statusKind,
  statusLabel,
  action,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  statusKind: StatusKind;
  statusLabel: string;
  action?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <li
      className={cn(
        "surface-panel interaction-lift flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between",
        disabled && "opacity-60",
      )}
    >
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-bg-elevated/75 shadow-sm">
          <Icon className="size-5 text-text-muted" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-[15px] font-bold text-text">{title}</p>
            <StatusPill kind={statusKind} label={statusLabel} />
          </div>
          <p className="mt-1 font-body text-sm font-light leading-relaxed text-text-muted">
            {description}
          </p>
        </div>
      </div>
      {action ? <div className="shrink-0 sm:ml-4">{action}</div> : null}
    </li>
  );
}

export default function SettingsIntegrationsPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const cal = useQuery({
    queryKey: ["calendar-connections", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => listCalendarConnections(getToken, activeOrganizationId),
  });

  const isGoogleConnected = cal.data?.some((c) => c.provider === "google") ?? false;
  const googleName = cal.data?.[0]?.calendar_name;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Integrations</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          Connect the tools your workflow already uses, with only ready surfaces shown.
        </p>
      </div>

      <ul className="space-y-3">
        <IntegrationCard
          icon={Calendar}
          title="Google Calendar"
          description="Create calendar holds automatically from form submissions. Configure per page in Studio."
          statusKind={isGoogleConnected ? "connected" : "not-connected"}
          statusLabel={
            isGoogleConnected
              ? googleName ? `Connected — ${googleName}` : "Connected"
              : "Not connected"
          }
          action={
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link href="/settings/calendars">Manage</Link>
            </Button>
          }
        />
        <IntegrationCard
          icon={Webhook}
          title="HTTP webhooks"
          description="Automations can POST payloads to HTTPS endpoints — pair with Zapier/Make or bespoke backends instead of brittle copy-paste snippets."
          statusKind="not-connected"
          statusLabel="See roadmap"
          action={
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link href="/roadmap#webhooks">How we ship this</Link>
            </Button>
          }
        />
        <IntegrationCard
          icon={Zap}
          title="Packaged Zapier marketplace app"
          description="A first-party Zap lands after webhook automation exits beta — timelines live on the public roadmap."
          statusKind="not-connected"
          statusLabel="Planned — not gated as available"
          action={
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link href="/roadmap#integrations">Roadmap</Link>
            </Button>
          }
        />
      </ul>
    </div>
  );
}
