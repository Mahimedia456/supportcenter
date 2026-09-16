$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 18.4 Device Detail Export Fix" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path missing." }
if (-not (Test-Path $Backend)) { throw "Backend path missing." }

Write-Host "[1/4] Verifying device-health exports..." -ForegroundColor Yellow
$Lib = Join-Path $Mobile "src\lib\device-health.ts"
$Text = Get-Content $Lib -Raw

foreach ($Name in @("deviceTickets", "regionsForDevice", "topIssuesForDevice")) {
    if ($Text -notmatch "export function $Name") {
        throw "Missing export: $Name"
    }
}

Write-Host "PASS: Device detail helper exports restored." -ForegroundColor Green

Write-Host "[2/4] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host "[3/4] Backend TypeScript..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[4/4] Complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 18.4 Device Detail Export Fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "Restart:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
