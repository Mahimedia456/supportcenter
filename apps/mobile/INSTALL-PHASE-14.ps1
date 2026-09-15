$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 14 Cache + Performance" -ForegroundColor Cyan
Write-Host "Async cache, stale fallback, retry/backoff, 429 handling, freshness status"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) {
    throw "Mobile path not found: $Mobile"
}

if (-not (Test-Path $Backend)) {
    throw "Backend path not found: $Backend"
}

Set-Location $Mobile

Write-Host "[1/4] Installing Expo-compatible AsyncStorage..." -ForegroundColor Yellow
npx expo install @react-native-async-storage/async-storage
if ($LASTEXITCODE -ne 0) {
    throw "AsyncStorage installation failed."
}

Write-Host "[2/4] Mobile TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[3/4] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[4/4] Phase 14 verification complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 14 installed successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Run:"
Write-Host "Terminal 1: cd E:\Supportcenter\backend ; npm run start:dev"
Write-Host "Terminal 2: cd E:\Supportcenter\apps\mobile ; npx expo start -c"
