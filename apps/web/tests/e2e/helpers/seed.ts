import { apiV1Url, e2eSeedToken } from "./env";

export type SeededOrg = {
  userId: string;
  organizationId: string;
  slug: string;
};

type SeedOrgApiResponse = {
  user_id: string;
  organization_id: string;
  slug: string;
};

/** Creates a user + org via the gated E2E seed API (requires FORGE_E2E_TOKEN). */
export async function createTestOrg(): Promise<SeededOrg> {
  const res = await fetch(`${apiV1Url()}/__e2e__/seed-org`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forge-E2e-Token": e2eSeedToken(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createTestOrg failed: ${res.status} ${text}`);
  }
  const body = (await res.json()) as SeedOrgApiResponse;
  return {
    userId: body.user_id,
    organizationId: body.organization_id,
    slug: body.slug,
  };
}

/** Headers for API calls as a test user in a tenant (AUTH_TEST_BYPASS + ENVIRONMENT=test). */
export function forgeTestHeaders(userId: string, organizationId: string): Record<string, string> {
  return {
    "x-forge-test-user-id": userId,
    "x-forge-active-org-id": organizationId,
  };
}
