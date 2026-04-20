/**
 * Public marketing template fetches — no shared `api.ts` graph (keeps SSG/prerender safe).
 * @see getTemplateDetail for authenticated template APIs.
 */

import { getApiUrl } from "@/lib/api-url";

export type PublicTemplateOut = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  preview_image_url: string | null;
  html: string;
};

export class PublicTemplateFetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "PublicTemplateFetchError";
  }
}

export async function getPublicTemplateBySlug(slug: string): Promise<PublicTemplateOut> {
  const res = await fetch(`${getApiUrl()}/public/templates/by-slug/${encodeURIComponent(slug)}`);
  const json = res.headers.get("content-type")?.includes("application/json")
    ? await res.json().catch(() => null)
    : null;
  if (!res.ok) {
    throw new PublicTemplateFetchError(res.statusText || "Request failed", res.status, json);
  }
  return json as PublicTemplateOut;
}

export async function listPublicTemplateSlugs(): Promise<string[]> {
  const res = await fetch(`${getApiUrl()}/public/templates/slugs`);
  const json = res.headers.get("content-type")?.includes("application/json")
    ? await res.json().catch(() => null)
    : null;
  if (!res.ok) {
    throw new PublicTemplateFetchError(res.statusText || "Request failed", res.status, json);
  }
  return (json as { slugs: string[] }).slugs;
}
