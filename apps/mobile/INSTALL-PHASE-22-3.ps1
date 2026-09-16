$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 22.3 Hobby Cron Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"

Write-Host "[1/4] Verifying Hobby-safe Vercel cron..." -ForegroundColor Yellow

$Vercel = Join-Path $Backend "vercel.json"

if (-not (Test-Path $Vercel)) {
    throw "backend\vercel.json missing."
}

$VercelText = [System.IO.File]::ReadAllText($Vercel)

if ($VercelText -match '"schedule"\s*:\s*"0 \* \* \* \*"') {
    throw "Hourly Vercel cron is still present. Hobby deployment will fail."
}

if ($VercelText -notmatch '"schedule"\s*:\s*"0 0 \* \* \*"') {
    throw "Daily Hobby-safe Vercel cron not found."
}

Write-Host "PASS: Vercel cron is Hobby-compatible (daily)." -ForegroundColor Green

Write-Host "[2/4] Verifying GitHub hourly workflow..." -ForegroundColor Yellow

$Workflow = Join-Path $Root ".github\workflows\hourly-zendesk-sync.yml"

if (-not (Test-Path $Workflow)) {
    throw "GitHub hourly workflow missing."
}

$WorkflowText = [System.IO.File]::ReadAllText($Workflow)

if ($WorkflowText -notmatch "0 \* \* \* \*") {
    throw "GitHub hourly cron schedule missing."
}

if ($WorkflowText -notmatch "SUPPORTCENTER_CRON_SECRET") {
    throw "GitHub secret reference missing."
}

Write-Host "PASS: GitHub Actions hourly sync workflow ready." -ForegroundColor Green

Write-Host "[3/4] Backend TypeScript..." -ForegroundColor Yellow

Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[4/4] Complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 22.3 Hobby Cron Fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "Next:"
Write-Host "1. GitHub repo -> Settings -> Secrets and variables -> Actions"
Write-Host "2. Add repository secret SUPPORTCENTER_CRON_SECRET"
Write-Host "3. Use the SAME value as Vercel CRON_SECRET"
Write-Host "4. git push"
Write-Host "5. Vercel deployment should no longer fail on Hobby cron limits"
