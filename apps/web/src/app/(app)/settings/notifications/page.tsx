"use client";

import { PageHeader } from "@/components/chrome/page-header";
import { EmptyState } from "@/components/chrome/empty-state";
import { Bell } from "lucide-react";

export default function SettingsNotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Control automation alerts and product email."
      />
      <EmptyState
        icon={Bell}
        title="Notification preferences"
        description="Granular controls will appear here as automations ship."
      />
    </>
  );
}
