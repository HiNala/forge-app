"use client";

import { LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/chrome/empty-state";

export default function TemplatesPage() {
  const router = useRouter();
  return (
    <EmptyState
      icon={LayoutTemplate}
      title="Templates gallery"
      description="Browse starter templates from Mission F06. For now, create a page from the Studio when it lands."
      primaryAction={{
        label: "Go to Studio",
        onClick: () => router.push("/studio"),
      }}
      secondaryAction={{
        label: "Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    />
  );
}
