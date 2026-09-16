$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 18.5 Data Fallback + All Filter" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path missing." }
if (-not (Test-Path $Backend)) { throw "Backend path missing." }

Write-Host "[1/5] Verifying Home All preset..." -ForegroundColor Yellow
$DateFilter = Join-Path $Mobile "src\components\overview\OverviewDateFilter.tsx"
$DateFilterText = Get-Content $DateFilter -Raw

if ($DateFilterText -notmatch "key:\s*'all'") {
    throw "Overview All preset missing."
}

Write-Host "PASS: Home All visible preset installed." -ForegroundColor Green

Write-Host "[2/5] Verifying resilient Zendesk ticket source..." -ForegroundColor Yellow
$Source = Join-Path $Mobile "src\lib\zendesk-source.ts"
$SourceText = Get-Content $Source -Raw

foreach ($Name in @("zendeskAllTickets", "zendeskAnalyticsTickets", "zendeskRecentTickets")) {
    if ($SourceText -notmatch $Name) {
        throw "Missing ticket fallback: $Name"
    }
}

Write-Host "PASS: Full -> 90d -> recent ticket fallback installed." -ForegroundColor Green

Write-Host "[3/5] Verifying device plural mapping..." -ForegroundColor Yellow
$Mapper = Join-Path $Mobile "src\lib\zendesk-dimensions.ts"
$MapperText = Get-Content $Mapper -Raw

if ($MapperText -notmatch "'devices'") {
    throw "Devices plural mapping missing."
}

Write-Host "PASS: Atomos device/product mapping expanded." -ForegroundColor Green

Write-Host "[4/5] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host "[5/5] Backend TypeScript..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host ""
Write-Host "PASS: Phase 18.5 Data Fallback + All Filter installed." -ForegroundColor Green
Write-Host ""
Write-Host "Restart:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
