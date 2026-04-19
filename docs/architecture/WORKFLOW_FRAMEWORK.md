# Workflow framework (Forge)

This document describes how flagship workflows are integrated end-to-end so future page types (menus, invoices, etc.) can follow the same pattern.

## 1. Intent and generation

- **Single entry:** `POST /api/v1/studio/generate` (SSE) is the only Studio creation path.
- **Intent:** `parse_intent` in `app/services/orchestration/intent_parser.py` emits a `PageIntent` with `page_type`, `title_suggestion`, optional `fields`, etc.
- **Ambiguity:** When a flagship `page_type` is chosen but heuristic confidence is low, `workflow_clarify` is emitted **before** the `intent` event (see `workflow_confidence.py`). The stream continues with the default intent; the client can re-submit with `forced_workflow` in the request body to override.
- **Forced workflow:** `StudioGenerateRequest.forced_workflow` pins `contact-form` | `booking-form` | `proposal` | `pitch_deck` for that run.

## 2. Composer and page type

- **Assembly:** `compose_assembly_plan` + `render_section` build HTML; `proposal` / `pitch_deck` finalize through `finalize_proposal_studio_html` and `finalize_deck_studio_html`.
- **Registration:** Add the new `page_type` literal to `PageIntent` and any public/runtime injectors (tracker, proposal/deck helpers).

## 3. App surfaces (`apps/web`)

- **Config:** `src/lib/workflow-config.ts` — `getWorkflowFamily`, `getPageDetailConfig`, `workflowChipProps` for dashboard + shell consistency.
- **Studio:** Workflow cards **prime** the textarea; generation still requires explicit submit.
- **Dashboard:** Query param `workflow=` filters by family (`contact` | `proposal` | `deck` | `other`).
- **Page detail:** Tabs/labels come from `getPageDetailConfig`; deck uses `/export` instead of `/automations` until exports ship.
- **Onboarding:** `user_preferences.onboarded_for_workflow` is set from the workflow picker (`app/schemas/user_preferences_full.py`).

## 4. Public runtime

- **Badge:** Starter/trial orgs receive a “Made with Forge” pill injected in `public_runtime` via `inject_made_with_forge_badge` (`app/services/public_brand_badge.py`). Pro+ hides it.

## 5. Analytics & mail (next)

- Org analytics can aggregate by `getWorkflowFamily` from pages.
- Per-workflow digest sections (BI-04) should call the same family keys and omit empty sections.

## Checklist for a new workflow

1. Extend `PageIntent.page_type` and intent/compose prompts.
2. Add composer/finalize path if needed.
3. Map family in `workflow-config.ts` (chip colors, Page Detail copy).
4. Seed templates / marketing copy.
5. Add focused tests: intent clarify, dashboard filter, and optional E2E path.
