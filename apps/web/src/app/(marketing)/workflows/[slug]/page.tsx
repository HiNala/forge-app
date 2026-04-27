import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WorkflowMarketingPage } from "@/components/marketing/workflow-landing-page";
import { getWorkflowLanding, workflowMetadata, WORKFLOW_SLUGS } from "@/lib/workflow-landings";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return WORKFLOW_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const w = getWorkflowLanding(slug);
  if (!w) return { title: "Not found" };
  return workflowMetadata(w.slug);
}

export default async function WorkflowDynamicPage({ params }: Props) {
  const { slug } = await params;
  const w = getWorkflowLanding(slug);
  if (!w) notFound();
  return <WorkflowMarketingPage content={w} />;
}
