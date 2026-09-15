$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.2 Auth + Vector Icons Fix" -ForegroundColor Cyan
Write-Host "Fixes signIn/signOut contract and missing @expo/vector-icons"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Set-Location $Mobile

Write-Host "[1/5] Installing Expo Vector Icons..." -ForegroundColor Yellow
npx expo install @expo/vector-icons
if ($LASTEXITCODE -ne 0) {
    throw "@expo/vector-icons installation failed."
}

Write-Host "[2/5] Verifying final UI dependencies..." -ForegroundColor Yellow
npm ls `
  @expo/vector-icons `
  expo-linear-gradient `
  react-native-reanimated `
  react-native-worklets `
  react-native-safe-area-context `
  --depth=0

if ($LASTEXITCODE -ne 0) {
    throw "Final dependency verification failed."
}

Write-Host "[3/5] Verifying AuthContext contract..." -ForegroundColor Yellow
$AuthContext = Join-Path $Mobile "src\context\AuthContext.tsx"

if (-not (Test-Path $AuthContext)) {
    throw "AuthContext not found: $AuthContext"
}

$AuthText = Get-Content $AuthContext -Raw

if ($AuthText -notmatch "signIn\s*:") {
    throw "AuthContext does not expose signIn."
}

if ($AuthText -notmatch "signOut\s*:") {
    throw "AuthContext does not expose signOut."
}

Write-Host "PASS: signIn/signOut found." -ForegroundColor Green

Write-Host "[4/5] Mobile TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[5/5] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host ""
Write-Host "PASS: Phase 15.2 final UI hotfix complete." -ForegroundColor Green
Write-Host ""
Write-Host "Do NOT rerun Phase 15.1." -ForegroundColor DarkYellow
Write-Host ""
Write-Host "Start backend:"
Write-Host "  cd E:\Supportcenter\backend"
Write-Host "  npm run start:dev"
Write-Host ""
Write-Host "Start mobile clean:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
