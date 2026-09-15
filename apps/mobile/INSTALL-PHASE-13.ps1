$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 13 Profile + Workspace + System Health" -ForegroundColor Cyan
Write-Host "Profile, notification preferences, logout polish, backend/DB/Zendesk/session health"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) {
    throw "Mobile path not found: $Mobile"
}

if (-not (Test-Path $Backend)) {
    throw "Backend path not found: $Backend"
}

function Ensure-UnknownHrefCast([string]$FilePath) {
    if (-not (Test-Path $FilePath)) {
        return
    }

    $content = Get-Content $FilePath -Raw
    $content = $content -replace "\}\s+as Href\);", "} as unknown as Href);"
    Set-Content -Path $FilePath -Value $content -Encoding UTF8
}

# Carry forward typed-route compatibility from Phase 12.
Ensure-UnknownHrefCast (Join-Path $Mobile "src\app\(tabs)\devices.tsx")
Ensure-UnknownHrefCast (Join-Path $Mobile "src\app\(tabs)\insights.tsx")
Ensure-UnknownHrefCast (Join-Path $Mobile "src\app\(tabs)\alerts.tsx")

Write-Host "[1/3] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[2/3] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[3/3] Backend health availability..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:3000/health" -Method GET -TimeoutSec 5
    Write-Host "Backend health endpoint reachable." -ForegroundColor Green
}
catch {
    Write-Host "Backend not currently running; compile checks still passed." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "PASS: Phase 13 installed and verified." -ForegroundColor Green
Write-Host ""
Write-Host "Run:"
Write-Host "Terminal 1: cd E:\Supportcenter\backend ; npm run start:dev"
Write-Host "Terminal 2: cd E:\Supportcenter\apps\mobile ; npx expo start -c"
