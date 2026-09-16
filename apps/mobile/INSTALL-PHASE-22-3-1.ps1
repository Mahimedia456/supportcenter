$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 22.3.1 Hourly Endpoint Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"

Write-Host "[1/4] Verifying hourly endpoint file..." -ForegroundColor Yellow

$Endpoint = Join-Path $Backend "api\zendesk-hourly-sync.ts"

if (-not (Test-Path $Endpoint)) {
    throw "backend\api\zendesk-hourly-sync.ts missing."
}

$EndpointText = [System.IO.File]::ReadAllText($Endpoint)

foreach ($Term in @("CRON_SECRET", "zendesk_cache_snapshots", "last90DayTickets")) {
    if ($EndpointText -notmatch [regex]::Escape($Term)) {
        throw "Hourly endpoint missing: $Term"
    }
}

Write-Host "PASS: direct hourly Vercel function exists." -ForegroundColor Green

Write-Host "[2/4] Verifying GitHub Actions URL..." -ForegroundColor Yellow

$Workflow = Join-Path $Root ".github\workflows\hourly-zendesk-sync.yml"
$WorkflowText = [System.IO.File]::ReadAllText($Workflow)

if ($WorkflowText -notmatch "/api/zendesk-hourly-sync") {
    throw "GitHub Actions workflow URL is incorrect."
}

Write-Host "PASS: GitHub Actions points to direct hourly endpoint." -ForegroundColor Green

Write-Host "[3/4] Backend TypeScript..." -ForegroundColor Yellow

Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[4/4] Complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 22.3.1 Hourly Endpoint Fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "Push this patch, wait for Vercel deployment, then manually Run workflow."
