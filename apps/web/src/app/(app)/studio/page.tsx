import type { Metadata } from "next";
import { StudioWorkspace } from "@/components/studio/studio-workspace";

export const metadata: Metadata = {
  title: "Studio | Forge",
};

export default function StudioPage() {
  return <StudioWorkspace />;
}
