import * as React from "react";
import { AppShell } from "@/components/chrome/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
