"use client";

import { BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/chrome/empty-state";

export default function AnalyticsPage() {
  const router = useRouter();
  return (
    <EmptyState
      icon={BarChart3}
      title="Analytics"
      description="Traffic, funnels, and automation health land in Mission F05. The shell route is here so navigation and breadcrumbs stay coherent."
      primaryAction={{
        label: "Back to dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    />
  );
}
