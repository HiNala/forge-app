# Analytics in Forge (user guide)

## What we track

- **Published pages** — Views, scroll depth, section engagement, form progression, booking and proposal/deck interactions (see [Event taxonomy](../architecture/EVENT_TAXONOMY.md)).
- **Signed-in product** — Studio, dashboard, settings, and lifecycle milestones (upgrade, first publish, etc.).

Identifiers:

- Visitors get a first-party **visitor** cookie; sessions roll after inactivity.
- After you sign up, earlier anonymous activity can be tied to your account for reporting (identity merge).

## Reading the data

- **Organization analytics** — Summary and per-page metrics in the app (`/analytics` and page-level analytics where enabled).
- **Engagement** — Funnels (e.g. contact form steps), retention summaries, and realtime activity use the same underlying events.
- **Exports** — When available for your plan, exports are generated asynchronously with a download link.

## Privacy

- Public endpoints do not trust browser-supplied org or user ids; the server resolves context from the published page or your session.
- Organization policies (retention, consent) may apply per plan and settings.

For API details, administrators can refer to `GET /api/v1/analytics/*` in the OpenAPI schema.
