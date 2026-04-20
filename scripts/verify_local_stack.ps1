# Smoke-check after: docker compose up -d --build (repo root)
# Next: copy .env.example -> .env and add Clerk + LLM keys for full sign-in / Studio.
$ErrorActionPreference = "Continue"
Write-Host "API health:" -ForegroundColor Cyan
try {
    Invoke-RestMethod "http://127.0.0.1:8000/health" -TimeoutSec 15
} catch {
    Write-Host $_ -ForegroundColor Red
    exit 1
}
Write-Host "Web :3001 (expect 200 when Next dev is up):" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest "http://127.0.0.1:3001/" -UseBasicParsing -TimeoutSec 60
    Write-Host "OK $($r.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host $_ -ForegroundColor Yellow
    Write-Host "Tip: first `pnpm install` inside the web container can take several minutes after a fresh volume." -ForegroundColor DarkGray
}
exit 0
