$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 22.2 Direct Vercel Cache Endpoints" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"

Write-Host "[1/5] Verifying direct API files..." -ForegroundColor Yellow

foreach ($Relative in @(
    "api\zendesk-cache-snapshot.ts",
    "api\zendesk-cache-sync.ts",
    "api\_support-cache-common.ts"
)) {
    $Path = Join-Path $Backend $Relative
    if (-not (Test-Path $Path)) {
        throw "Missing direct API file: $Relative"
    }
}

Write-Host "PASS: direct Vercel cache endpoints present." -ForegroundColor Green

Write-Host "[2/5] Verifying mobile endpoint migration..." -ForegroundColor Yellow

$DbPath = Join-Path $Mobile "src\lib\zendesk-db.ts"
$DbText = [System.IO.File]::ReadAllText($DbPath)

if ($DbText -match "'/zendesk/cache/") {
    throw "Old broken Nest cache route still present."
}

foreach ($Endpoint in @(
    "/api/zendesk-cache-snapshot",
    "/api/zendesk-cache-sync"
)) {
    if ($DbText -notmatch [regex]::Escape($Endpoint)) {
        throw "Missing direct endpoint: $Endpoint"
    }
}

Write-Host "PASS: mobile uses direct /api cache endpoints." -ForegroundColor Green

Write-Host "[3/5] Backend TypeScript..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[4/5] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host "[5/5] Complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 22.2 Direct Vercel Cache Endpoints installed." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: git push + Vercel redeploy is required."
Write-Host "After deploy test:"
Write-Host "  https://supportcenter-kappa.vercel.app/api/zendesk-cache-snapshot"
Write-Host "Without Authorization it should return Unauthorized/401, NOT Cannot GET/404."
