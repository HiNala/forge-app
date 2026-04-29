"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { WarRoomWorkspace } from "@/components/war-room/war-room-workspace";

export default function WarRoomProjectPage() {
  const params = useParams<{ projectId: string }>();
  const raw = typeof params.projectId === "string" ? params.projectId : "";
  const id = decodeURIComponent(raw);
  if (!id || id === "new") {
    return (
      <div className="p-6 font-body text-sm text-text-muted" role="status">
        Invalid War Room destination.
      </div>
    );
  }

  return <WarRoomWorkspace projectId={id} />;
}
