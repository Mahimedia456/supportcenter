$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 17 Zendesk Native Data" -ForegroundColor Cyan
Write-Host "Official Zendesk ticket metrics, SLA events, product custom fields, resilient insights"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Write-Host "[1/5] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[2/5] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[3/5] Checking required Zendesk routes..." -ForegroundColor Yellow
$Controller = Join-Path $Backend "src\zendesk\zendesk.controller.ts"
$Text = Get-Content $Controller -Raw

foreach ($Route in @("ticket-metrics", "metric-events", "analytics/tickets")) {
    if ($Text -notmatch [regex]::Escape($Route)) {
        throw "Missing Zendesk route: $Route"
    }
}

Write-Host "[4/5] Checking mobile production URL..." -ForegroundColor Yellow
$Env = Join-Path $Mobile ".env"
if (Test-Path $Env) {
    $EnvText = Get-Content $Env -Raw
    if ($EnvText -match "10\.0\.2\.2|localhost|127\.0\.0\.1") {
        Write-Host "WARNING: mobile .env still points to local backend." -ForegroundColor Red
    }
}

Write-Host "[5/5] Ready." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 17 Zendesk Native Data installed." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT for Vercel:"
Write-Host "  git add ."
Write-Host "  git commit -m `"Add Zendesk native metrics and product data`""
Write-Host "  git push"
Write-Host ""
Write-Host "Then redeploy backend before testing mobile Alerts/Insights/Devices."
