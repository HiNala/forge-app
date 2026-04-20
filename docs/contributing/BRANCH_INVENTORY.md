# Branch inventory (Forge)

**Canonical line of development:** `main` (always deployable; CI green).

## Mission branches (`mission-*`)

Historical mission branches are **pointers for archaeology**, not parallel releases. When missions are finished, their work lands on `main` via merge or fast-forward; old tips are preserved as **git tags** under `archive/YYYY-MM-DD/<branch-name>` so nothing is lost.

After a cleanup, all local `mission-*` branches were reset to match `main`. Previous tips are reachable via those tags.

To list archive tags:

```bash
git tag -l 'archive/*'
```

To inspect a pre-reset tip:

```bash
git log -1 archive/2026-04-20/mission-bi-02-middleware-routing
```

## Remote branches on GitHub

Stale **`origin/mission-*`** names may still exist. They are safe to delete when no open PRs reference them:

```bash
git push origin --delete <branch-name>
```

Do **not** delete `main`. Review Dependabot branches via normal PR workflow.

## Dependabot

Dependency bump branches (`dependabot/*`) should be merged or closed via GitHub PRs after CI passes—not by merging all branches locally into `main` at once.
