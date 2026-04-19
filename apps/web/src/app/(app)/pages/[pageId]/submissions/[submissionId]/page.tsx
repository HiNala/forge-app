import { redirect } from "next/navigation";

/** Deep link from notifications — expands the row on the Submissions tab. */
export default async function SubmissionPermalinkPage({
  params,
}: {
  params: Promise<{ pageId: string; submissionId: string }>;
}) {
  const { pageId, submissionId } = await params;
  redirect(`/pages/${pageId}/submissions?expand=${encodeURIComponent(submissionId)}`);
}
