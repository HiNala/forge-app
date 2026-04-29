import { StudioWebCanvasShell } from "./web-studio";

export default async function StudioWebDynamicPage(props: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await props.params;
  return <StudioWebCanvasShell projectId={projectId} />;
}
