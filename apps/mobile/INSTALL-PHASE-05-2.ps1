$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 05.2 Installer Path Fix" -ForegroundColor Cyan
Write-Host "Fixing project root detection for E:\Supportcenter\apps\mobile"

# Script is located at:
# E:\Supportcenter\apps\mobile\INSTALL-PHASE-05-2.ps1
# Project root is therefore two levels up from apps\mobile.
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

Write-Host "Resolved project root: $Root" -ForegroundColor DarkGray
Write-Host "Mobile path: $Mobile" -ForegroundColor DarkGray
Write-Host "Backend path: $Backend" -ForegroundColor DarkGray

if (-not (Test-Path $Mobile)) {
    throw "Mobile path not found: $Mobile"
}

if (-not (Test-Path $Backend)) {
    throw "Backend path not found: $Backend"
}

function Run-Step([string]$Label, [scriptblock]$Command) {
    Write-Host $Label -ForegroundColor Yellow
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Run-Step "[1/3] Mobile TypeScript check..." {
    Set-Location $Mobile
    npx tsc --noEmit
}

Run-Step "[2/3] Backend TypeScript check..." {
    Set-Location $Backend
    npx tsc --noEmit
}

Run-Step "[3/3] Supabase database check..." {
    Set-Location $Backend
    npm run db:check
}

Write-Host ""
Write-Host "PASS: Phase 05.2 installer/path verification complete." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT:"
Write-Host "cd E:\Supportcenter\backend"
Write-Host "npm run seed:phase02"
Write-Host "npm run start:dev"
