# Design memory and feedback — privacy

## What we store

- **Design memory rows** — JSON value + strength + audit `sources` (includes originating `run_id` / feedback id when applicable).
- **Artifact feedback** — sentiment, structured reason codes, optional free text, action labels (e.g. `less_busy`), linked to `orchestration_runs`.
- **Preferences** — `forge_apply_memory`, `forge_memory_share_across_orgs`, `forge_contribute_feedback_to_platform`, `forge_weekly_learning_digest` live in `users.user_preferences` (merged by `/auth/me/preferences`).

## Who can see it

- The **user** always sees their own memory in Settings → Memory.
- **Platform operators** may see aggregated, anonymized rollups in `/admin/patterns` when the user has not opted out of platform-level analytics.

## Retention and deletion

- Memory rows follow standard workspace lifecycle; **Forget everything** on Settings → Memory issues a hard delete for that user’s rows in the active org context.
- Account deletion flows (BI-04 grace) should cascade user-linked rows as part of the existing purge pipeline—keep memory tables in that manifest when extending BI-04.

## Export

- Include `design_memory` + `artifact_feedback` in full account export when that export job is extended (V2-P10).
