"use client";

import { PageHeader } from "@/components/chrome/page-header";
import { EmptyState } from "@/components/chrome/empty-state";
import { User } from "lucide-react";

export default function SettingsProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account identity and how you appear to teammates."
      />
      <EmptyState
        icon={User}
        title="Profile details"
        description="Avatar sync from your sign-in provider and display preferences will land in a subsequent release."
      />
    </>
  );
}
