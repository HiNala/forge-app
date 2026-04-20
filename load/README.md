# k6 load tests (GL-03)

Run locally (requires API + target routes):

```bash
docker run --rm -i -v "$PWD/load:/load" -e BASE_URL=http://host.docker.internal:8000 grafana/k6 run /load/scenarios/public_form_submit.js
```

Set `BASE_URL` to your API origin (no trailing path). Scenarios use public submit URLs — point `ORG_SLUG` / `PAGE_SLUG` at a real published page in the target environment.

CI: see `.github/workflows/load-k6.yml` (optional nightly).
