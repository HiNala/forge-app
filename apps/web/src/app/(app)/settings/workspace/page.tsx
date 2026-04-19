"use client";

import { PageHeader } from "@/components/chrome/page-header";
import { EmptyState } from "@/components/chrome/empty-state";
import { Building2 } from "lucide-react";

export default function SettingsWorkspacePage() {
  return (
    <>
      <PageHeader
        title="Workspace"
        description="Rename, slug, and workspace-level defaults."
      />
      <EmptyState
        icon={Building2}
        title="Workspace settings"
        description="Full editing is coming soon — use the workspace switcher to manage multiple workspaces today."
      />
    </>
  );
}
