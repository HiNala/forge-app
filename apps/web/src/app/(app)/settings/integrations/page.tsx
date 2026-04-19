"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MessageSquare, Webhook, Zap } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/chrome/page-header";
import { Button } from "@/components/ui/button";
import { listCalendarConnections } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

export default function SettingsIntegrationsPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const cal = useQuery({
    queryKey: ["calendar-connections", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => listCalendarConnections(getToken, activeOrganizationId),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Integrations"
        description="Connect the tools your workflow already uses. Coming-soon items stay visible and honest."
      />

      <ul className="space-y-4">
        <IntegrationCard
          icon={Calendar}
          title="Google Calendar"
          description="Create holds from form submissions (also configured per page)."
          status={
            cal.data?.some((c) => c.provider === "google")
              ? `Connected${cal.data?.[0]?.calendar_name ? ` — ${cal.data[0].calendar_name}` : ""}`
              : "Not connected"
          }
          action={
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link href="/settings/billing">Use page automations</Link>
            </Button>
          }
        />
        <IntegrationCard
          icon={Calendar}
          title="Apple Calendar"
          description="Subscribe and sync events with Apple Calendar."
          status="Coming soon"
          disabled
        />
        <IntegrationCard
          icon={MessageSquare}
          title="Slack"
          description="Post notifications to a Slack channel."
          status="Coming soon"
          disabled
        />
        <IntegrationCard
          icon={Zap}
          title="Zapier"
          description="Trigger Zaps when submissions arrive."
          status="Coming soon"
          disabled
        />
        <IntegrationCard
          icon={Webhook}
          title="Custom webhooks"
          description="POST JSON payloads to your servers."
          status="Coming soon"
          disabled
        />
      </ul>
    </div>
  );
}

function IntegrationCard({
  icon: Icon,
  title,
  description,
  status,
  action,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: string;
  action?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <li
      className={`flex flex-col gap-3 rounded-[12px] border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${disabled ? "opacity-70" : ""}`}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="font-display font-semibold text-text">{title}</p>
          <p className="mt-1 text-sm text-text-muted font-body">{description}</p>
          <p className="mt-2 text-xs font-medium text-text-muted">Status: {status}</p>
        </div>
      </div>
      {action ? <div className="shrink-0 sm:ml-4">{action}</div> : null}
    </li>
  );
}
