"use client";

import { LineChart } from "lucide-react";
import { ComingSoonPlaceholder } from "@/components/chrome/coming-soon-placeholder";

export default function PageAnalyticsStub() {
  return (
    <ComingSoonPlaceholder
      title="Page analytics"
      description="Views, submissions, and conversion for this page only."
      icon={LineChart}
    />
  );
}
