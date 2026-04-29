# Public page iframe security model

## Threat model

Published Forge mini-apps are rendered inside a **sandboxed iframe** on `forge.app` (or tenant custom domains) via `srcDoc`. Risks:

1. **HTML injection**: If authored page HTML contained executable script (e.g., via a bug in generators or uploads), scripts could steal session cookies scoped to `forge.app` or call APIs as the visitor.
2. **Same-origin escalation**: Combining `sandbox="allow-scripts allow-same-origin"` makes injected scripts behave like full first-party scripts on the framing origin.

## Layers (defense in depth)

| Layer | Responsibility |
|--------|----------------|
| **Generation & validation** | `html_validate.py` (API) rejects or strips disallowed constructs before persistence. Publish path refuses unsafe HTML. |
| **Client `srcDoc` wrapper** | `apps/web/src/lib/public-page-html.ts`: injects a strict CSP meta (`PUBLIC_SRC_DOC_CSP`) when missing; `script-src 'none'` blocks script execution in the document unless the HTML already brought its own CSP (then we leave it). |
| **Iframe sandbox** | `PUBLIC_IFRAME_SANDBOX` is currently **`allow-forms allow-popups`** (no `allow-scripts`, no `allow-same-origin`), so script tags in raw HTML do **not** execute — forms and small UI still work where allowed. **If** product later enables client-side runtime (conditional logic, trackers), revisit with allowlists + separate origin. |
| **Separate pages origin** (optional / roadmap) | Host user HTML on `*.forge-pages.app` (or similar) so first-party cookies stay off the dashboard origin. Enables stricter isolation for script-heavy experiences. |

## Studio preview

Authenticated Studio iframe (`studio-workspace.tsx`) uses **`sandbox="allow-forms allow-scripts"`** (no `allow-same-origin` in that string) — XSS risk is limited to the authenticated session previewing their own HTML; still gated by server-side validation on save.

## Verification

- API security tests under `apps/api/tests/security/` for publish-time validation.
- Web unit tests for `getApiUrl()` / public URL helpers (`apps/web/src/lib/api-url.test.ts`).
- Periodic threat review when changing CSP meta or iframe sandbox constants.
