"use client";

import { Inbox } from "lucide-react";
import { ComingSoonPlaceholder } from "@/components/chrome/coming-soon-placeholder";

export default function PageSubmissionsStub() {
  return (
    <ComingSoonPlaceholder
      title="Submissions"
      description="Responses and files collected from your live page."
      icon={Inbox}
    />
  );
}
