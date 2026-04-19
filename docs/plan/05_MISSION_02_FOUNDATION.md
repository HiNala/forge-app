# MISSION 02 — Foundation: Auth, Multi-Tenancy, Brand Kit

**Goal:** Make the scaffolded app real. A user can sign up, become the owner of their organization, switch orgs if they have multiple, set up a brand kit, and see nothing else because no pages exist yet. Multi-tenancy is enforced end-to-end — every API call is tenant-scoped, RLS is active, and a cross-tenant access attempt fails.

**Branch:** `mission-02-foundation`
**Prerequisites:** Mission 01 complete. Scaffold runs cleanly, all endpoints stubbed, schema deployed, auth provider decided (per ADR-002).
**Estimated scope:** Three major subsystems — auth + session, tenant middleware + RLS, brand kit. Cross-cutting, touches both apps.

---

## How To Run This Mission

Read Mission 01's completion report and the PRD §6 (Architecture) and §11 (Security) before you start. Then your todo list. Then execute, pushing to GitHub at clear milestones: auth flow wired, tenant middleware live, brand kit roundtripping, RLS proven with tests.

The rule for this mission is: **if a test does not exist that proves a tenant cannot see another tenant's data, the work is not done.** This mission sets the data isolation contract for every mission after it. A single missed `.where(org_id=...)` clause is a breach, and we prevent that at three levels — application, database RLS, CI check.

If at any point you find something missing in Mission 01's scaffolding that blocks you, fix it properly and update Mission 01's report. Do not paper over structural gaps.

**Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete. Do not stop until every item on the TODO list is verified complete.**

---

## TODO List

### Phase 1 — Authentication Provider Integration

1. Install the chosen auth provider's SDK (Clerk or Auth.js) in the frontend per ADR-002. If Clerk: `@clerk/nextjs`. If Auth.js v5: `next-auth@beta`.
2. Wire the auth provider in `apps/web/src/app/layout.tsx` or a provider component.
3. Add `middleware.ts` at the Next.js project root to protect `/app/*` routes and redirect unauthenticated users to `/signin`.
4. Implement the sign-in and sign-up pages under `(marketing)/signin/page.tsx` and `(marketing)/signup/page.tsx`. Use the provider's prebuilt components if available; style later in Mission 07.
5. On successful signup, call `POST /api/v1/auth/signup` on the backend to create the User row, the default Organization, and the Owner Membership. This is the backend-of-record for our business logic, distinct from the auth provider's user store.
6. Implement JWT verification middleware in the backend (`app/middleware/auth.py`) that extracts the auth provider's JWT from cookies, verifies the signature against the provider's JWKS, and loads the corresponding User row.
7. Implement the `GET /api/v1/auth/me` endpoint — returns User + all Memberships + the current active Organization.
8. Implement the `POST /api/v1/auth/switch-org` endpoint — validates membership, stores the active org ID in the session cookie or a JWT claim.
9. Handle the auth provider's webhook to sync user lifecycle events (`user.created`, `user.updated`, `user.deleted`). Webhook signature verification is mandatory — a failed verification returns 401.
10. Frontend: create `useSession()` hook that wraps the provider, returning `{user, memberships, activeOrg, isLoading}`. Memoize with React Query.

### Phase 2 — Multi-Tenancy & RLS

11. Create the Tenant Middleware in the backend (`app/middleware/tenant.py`). On every request after auth: (a) resolve the active org ID, (b) verify the user has a Membership in that org, (c) set the PostgreSQL session variable `app.current_tenant_id` via `SET LOCAL`, (d) attach `org_id` and `role` to `request.state`.
12. Set up a non-superuser Postgres role `forge_app` that the application connects as. This role does NOT have `BYPASSRLS`. Grant it the minimum privileges. Document in `docs/architecture/MULTI_TENANCY.md`.
13. Write RLS policies for every table with an `organization_id` column. Template:

    ```sql
    ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pages FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation ON pages
      USING (organization_id::text = current_setting('app.current_tenant_id', true));
    ```

    Apply this policy to: `memberships`, `invitations`, `brand_kits`, `pages`, `page_versions`, `page_revisions`, `conversations`, `messages`, `submissions` (and all its partitions), `submission_files`, `submission_replies`, `automation_rules`, `calendar_connections`, `automation_runs`, `analytics_events`, `subscription_usage`.
14. Write an Alembic migration that enables RLS on every tenant-scoped table and applies the policy. Migrations run as the superuser, so use `ALTER TABLE ... FORCE` to apply RLS even to the table owner.
15. Write a CI script `scripts/check-rls.py` that queries `information_schema.tables` for every table with an `organization_id` column and asserts RLS is enabled. Add to GitHub Actions CI.
16. Create a custom SQLAlchemy event listener (`before_cursor_execute`) that issues `SET LOCAL app.current_tenant_id = :tid` on every transaction start if a tenant context is present. Alternative: a dependency pattern that wraps every `get_db()` call with the session variable set. Pick the cleaner one based on the testing outcome.
17. Implement the organization endpoints from Part B of Mission 01: `GET /api/v1/org`, `PATCH /api/v1/org`, `DELETE /api/v1/org` (soft-delete with 30-day grace).

### Phase 3 — Team Invitations & RBAC

18. Implement `POST /api/v1/team/invite` — creates an Invitation row, sends email via Resend (reuse the email service stub, fill in the Resend call in Mission 05's spirit but simplified).
19. Implement `POST /api/v1/team/invitations/{token}/accept` — public endpoint, validates token + expiration, creates Membership, marks invitation accepted.
20. Implement `GET /api/v1/team/members` — list memberships in active org.
21. Implement `PATCH /api/v1/team/members/{member_id}` — change role. Requires Owner. Cannot change the last Owner's role (business rule).
22. Implement `DELETE /api/v1/team/members/{member_id}` — remove member. Requires Owner. Cannot remove self if last Owner.
23. Create `require_role()` dependency that takes a list of allowed roles and rejects with 403 if the caller's role is not in the list. Apply to every mutating endpoint per the endpoint's role requirement.
24. Frontend: build `(app)/settings/team/page.tsx` — list members with role badges, invite form, role dropdown, remove button. Gate the invite form and remove buttons behind the Owner role using the `useSession()` hook's `activeOrg.role`.

### Phase 4 — Brand Kit

25. Implement `GET /api/v1/org/brand` — return the org's BrandKit (auto-create with defaults if missing).
26. Implement `PUT /api/v1/org/brand` — upsert the BrandKit with validation (hex or oklch color format).
27. Implement `POST /api/v1/org/brand/logo` — multipart upload. Validate MIME type (PNG, JPEG, SVG, WebP), size (< 2MB), dimensions (square or aspect close to 1:1 recommended, enforce 4:1 max). Store to S3/MinIO with key `org/{org_id}/brand/logo.{ext}`. Return the URL.
28. Frontend: `(app)/settings/brand/page.tsx` — color pickers (HTML5 `<input type="color">` is fine for MVP), logo upload with drag-drop, font selector (curated list of 8-10 Google Fonts), voice note textarea. Save on blur with optimistic updates.
29. Wire BrandKit into the authenticated app's CSS — expose CSS variables scoped to the authenticated tenant's surface (NOT to generated pages, which read from their own `brand_kit_snapshot`).

### Phase 5 — Onboarding Flow

30. Build `(app)/onboarding/page.tsx` — one-screen wizard with three fields (workspace name, primary color, logo). Skippable. Redirects to `/dashboard` on complete.
31. Redirect new users to `/onboarding` after signup if their BrandKit is unset AND this is their first session on the default org.
32. Seed a welcome sample state: no pages yet, but Dashboard shows a clear empty state with a CTA into Studio.

### Phase 6 — Cross-Tenant Security Tests

33. Write integration tests that prove tenant isolation at the API layer. At minimum:
    - Create Org A, Org B, each with a page.
    - User of Org A calls `GET /api/v1/pages` — sees only Org A's pages.
    - User of Org A calls `GET /api/v1/pages/{org_b_page_id}` — gets 404 (not 403; we don't reveal existence).
    - User of Org A calls `PATCH /api/v1/pages/{org_b_page_id}` — gets 404.
    - Direct SQL query bypassing the tenant middleware (simulated by not setting the session variable) returns 0 rows due to RLS.
34. Write a test that proves the last Owner cannot demote themselves.
35. Write a test that proves an expired invitation cannot be accepted.
36. Write a test that proves the rate limiter blocks 11+ requests in a minute to the invite endpoint.

### Phase 7 — Developer Experience

37. Update the root README with signup → onboarding → brand kit flow.
38. Add seed script `apps/api/scripts/seed_dev.py` that creates: 2 dev users, 2 orgs, brand kits, a cross-membership scenario. Run via `docker compose exec api uv run python scripts/seed_dev.py`.
39. Document in `docs/runbooks/TENANT_ISOLATION.md` the full story of how RLS + middleware + CI check work together, and what to do when adding a new tenant-scoped table.
40. Commit the full mission with a meaningful summary commit on the branch, open a PR against `main`, write the mission report in `docs/missions/MISSION-02-REPORT.md`.

---

## Acceptance Criteria

- A new user can sign up, automatically become the Owner of a fresh Organization, and land on the onboarding flow.
- Brand kit saves and loads correctly, including logo upload.
- Team invitations send, are accepted, and create Memberships with the correct role.
- RBAC is enforced at the API layer — Viewer cannot call mutating endpoints; Editor cannot invite; Owner can.
- RLS is enabled on every tenant-scoped table, verified by the CI check.
- Cross-tenant access tests pass. Direct database queries without the session variable return 0 rows.
- `docker compose up --build` from a clean clone brings the app to the state where signup works end-to-end.
- All linting, typechecking, and tests pass.
- Mission report written.

---

## Repo tracking (living)

Auth, RLS, brand: **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** (Mission **02** in *By mission document*).

**Do not stop until every item is verified. Do not stop until every item is verified. Do not stop until every item is verified.**
