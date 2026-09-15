$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 16.3 Safe Area + Overview Recovery" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Set-Location $Mobile

Write-Host "[1/4] Verifying safe-area/icon dependencies..." -ForegroundColor Yellow
npm ls `
  @expo/vector-icons `
  react-native-safe-area-context `
  --depth=0

if ($LASTEXITCODE -ne 0) {
    throw "Required mobile dependencies are missing."
}

Write-Host "[2/4] Checking profile encoding/back button..." -ForegroundColor Yellow

$Profile = Join-Path $Mobile "src\app\profile.tsx"
$ProfileText = Get-Content $Profile -Raw

if ($ProfileText -match "â€¹|â€¢|â€º") {
    throw "Broken encoded glyphs are still present in Profile."
}

if ($ProfileText -notmatch "chevron-back") {
    throw "Profile real back icon is missing."
}

Write-Host "PASS: Account header/back button repaired." -ForegroundColor Green

Write-Host "[3/4] Mobile TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[4/4] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host ""
Write-Host "PASS: Phase 16.3 Safe Area + Overview Recovery installed." -ForegroundColor Green
Write-Host ""
Write-Host "Restart Metro:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
