/** Ensure public templates exist (catalog); noop placeholder until template seed API exists. */
export async function seedTemplates(): Promise<void> {
  if (process.env.PLAYWRIGHT_SKIP_TEMPLATE_SEED === "1") {
    return;
  }
  // Templates may already exist from migrations / API — extend with POST /templates if added.
}
