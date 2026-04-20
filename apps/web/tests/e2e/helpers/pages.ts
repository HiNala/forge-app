import { apiV1Url } from "./env";
import { forgeTestHeaders, type SeededOrg } from "./seed";

export type TestPage = { id: string; slug: string };

/**
 * Create a minimal page via API (requires seeded org + test auth headers).
 * Extend with workflow-specific fields as journeys are added.
 */
export async function createTestPage(
  org: SeededOrg,
  body: { title?: string; slug?: string; page_type?: string } = {},
): Promise<TestPage> {
  const title = body.title ?? "E2E Page";
  const slug = body.slug ?? `e2e-${Date.now().toString(36)}`;
  const page_type = body.page_type ?? "landing";
  const res = await fetch(`${apiV1Url()}/pages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...forgeTestHeaders(org.userId, org.organizationId),
    },
    body: JSON.stringify({ title, slug, page_type }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createTestPage failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { id: string; slug: string };
  return { id: json.id, slug: json.slug };
}
