$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.1 FINAL Dependency Fix" -ForegroundColor Cyan
Write-Host "Aligns Expo SDK 57 Reanimated/Worklets, then completes Final UI dependencies"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Set-Location $Mobile

Write-Host "[1/8] Current animation packages..." -ForegroundColor Yellow
npm ls react-native-reanimated react-native-worklets --depth=0
Write-Host ""

Write-Host "[2/8] Aligning Expo SDK 57 animation pair..." -ForegroundColor Yellow

# Expo SDK 57 recommended Reanimated is 4.5.1.
# Reanimated 4.6.0 requires Worklets 0.12.x, which conflicts with
# Expo SDK 57 expo-modules-core's supported 0.10.x Worklets line.
npm install `
  react-native-reanimated@4.5.1 `
  react-native-worklets@0.10.2 `
  --save-exact

if ($LASTEXITCODE -ne 0) {
    throw "Failed to align react-native-reanimated/react-native-worklets."
}

Write-Host "[3/8] Installing Final UI dependencies..." -ForegroundColor Yellow
npx expo install expo-linear-gradient react-native-safe-area-context

if ($LASTEXITCODE -ne 0) {
    throw "Final UI dependency install failed."
}

Write-Host "[4/8] Verifying dependency tree..." -ForegroundColor Yellow
npm ls `
  react-native-reanimated `
  react-native-worklets `
  expo-linear-gradient `
  react-native-safe-area-context `
  --depth=0

if ($LASTEXITCODE -ne 0) {
    throw "Dependency verification failed."
}

Write-Host "[5/8] Mobile TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[6/8] Expo dependency check..." -ForegroundColor Yellow
npx expo install --check

if ($LASTEXITCODE -ne 0) {
    Write-Host "Expo dependency check reported version differences. Do not run --fix automatically yet." -ForegroundColor DarkYellow
}

Write-Host "[7/8] Expo Doctor..." -ForegroundColor Yellow
npx expo-doctor

if ($LASTEXITCODE -ne 0) {
    Write-Host "Expo Doctor reported warnings. Review them, but dependency alignment step completed." -ForegroundColor DarkYellow
}

Write-Host "[8/8] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host ""
Write-Host "PASS: Phase 15.1 dependency fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "Now rerun the Final Phase installer:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  .\INSTALL-PHASE-15-FINAL.ps1"
Write-Host ""
Write-Host "Then start clean:"
Write-Host "  npx expo start -c"
