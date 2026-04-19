# Design open questions

| Topic | Status | Notes |
| ----- | ------ | ----- |
| Anthropic design artifact | **Pending fetch** | Endpoint returns **401** without a valid key. Run `apps/web/design/FETCH_DESIGN.md` with `ANTHROPIC_API_KEY`, commit `artifact.json` (and designer `README.md` into `apps/web/design/`), then reconcile `apps/web/src/styles/tokens.css`. |
| Sidebar preference sync | **In progress** | `stores/ui.ts` sends `PATCH ${NEXT_PUBLIC_API_URL}/v1/me/preferences` with `{ sidebar_collapsed }` when the env URL is set; failures are ignored until the route + auth exist. |
| `/v1/me/preferences` contract | **TBD** | Confirm body field name (`sidebar_collapsed`) with backend; adjust once API is stable. |

When the artifact lands, remove resolved rows and move any remaining defaults into `apps/web/design/INDEX.md`.
