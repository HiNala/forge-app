# Fetch Anthropic design artifact

From repository root (bash or Git Bash on Windows):

```bash
curl -sS "https://api.anthropic.com/v1/design/h/ZhxfTfNViMkEnjhpg1EkxA" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -o apps/web/design/artifact.json
```

PowerShell (set the key first):

```powershell
$env:ANTHROPIC_API_KEY = "<your-key>"
curl.exe -sS "https://api.anthropic.com/v1/design/h/ZhxfTfNViMkEnjhpg1EkxA" `
  -H "x-api-key: $env:ANTHROPIC_API_KEY" `
  -H "anthropic-version: 2023-06-01" `
  -o apps/web/design/artifact.json
```

If the API returns HTML, rename to `artifact.html`. If it returns a JSON manifest, save linked assets under this folder and document them in `INDEX.md`.

After a successful fetch, open any bundled `README.md`, reconcile tokens in `src/styles/tokens.css`, and trim `docs/design/OPEN_QUESTIONS.md` when resolved.
