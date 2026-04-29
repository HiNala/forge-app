import { StudioMobileCanvasShell } from "./mobile-studio";

export default async function StudioMobileDynamicPage(props: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await props.params;
  return <StudioMobileCanvasShell projectId={projectId} />;
}
