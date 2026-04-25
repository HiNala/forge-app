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
Write-Host "Web (Docker :3001 or local `pnpm dev:web` on :3000):" -ForegroundColor Cyan
$webOk = $false
foreach ($base in @("http://127.0.0.1:3001/", "http://127.0.0.1:3000/")) {
    try {
        $r = Invoke-WebRequest $base -UseBasicParsing -TimeoutSec 90
        Write-Host "OK $($r.StatusCode) $base" -ForegroundColor Green
        $webOk = $true
        break
    } catch {
        continue
    }
}
if (-not $webOk) {
    Write-Host "Web not reachable on :3001 or :3000." -ForegroundColor Yellow
    Write-Host "Tip: compose web — first pnpm install in the container can take several minutes. Local — run: pnpm dev:web" -ForegroundColor DarkGray
}
exit 0
