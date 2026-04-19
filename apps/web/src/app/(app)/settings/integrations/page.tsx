"use client";

import { PageHeader } from "@/components/chrome/page-header";
import { EmptyState } from "@/components/chrome/empty-state";
import { Plug } from "lucide-react";

export default function SettingsIntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect email, calendars, and webhooks."
      />
      <EmptyState
        icon={Plug}
        title="No integrations yet"
        description="Zapier-style hooks and first-party connectors ship in a later milestone."
      />
    </>
  );
}
