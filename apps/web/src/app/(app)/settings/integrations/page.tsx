"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MessageSquare, Webhook, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listCalendarConnections } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

type StatusKind = "connected" | "not-connected" | "coming-soon";

function StatusPill({ kind, label }: { kind: StatusKind; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-body text-[11px] font-semibold",
        kind === "connected" && "bg-success/10 text-success",
        kind === "not-connected" && "bg-bg-elevated text-text-subtle",
        kind === "coming-soon" && "bg-bg-elevated text-text-subtle",
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
        "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between",
        disabled && "opacity-60",
      )}
    >
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-elevated">
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
          Connect the tools your workflow already uses. Upcoming integrations are shown honestly.
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
          icon={Calendar}
          title="Apple Calendar"
          description="Subscribe to your Forge page calendar and sync events with Apple Calendar."
          statusKind="coming-soon"
          statusLabel="Coming soon"
          disabled
        />
        <IntegrationCard
          icon={MessageSquare}
          title="Slack"
          description="Send a Slack message when a new form submission arrives."
          statusKind="coming-soon"
          statusLabel="Coming soon"
          disabled
        />
        <IntegrationCard
          icon={Zap}
          title="Zapier"
          description="Trigger any Zap when submissions arrive — connect thousands of apps."
          statusKind="coming-soon"
          statusLabel="Coming soon"
          disabled
        />
        <IntegrationCard
          icon={Webhook}
          title="Custom webhooks"
          description="POST a JSON payload to your own server on any form submission event."
          statusKind="coming-soon"
          statusLabel="Coming soon"
          disabled
        />
      </ul>
    </div>
  );
}
