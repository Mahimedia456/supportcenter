$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 18.6 APK Production Runtime Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Api = Join-Path $Mobile "src\lib\api.ts"

if (-not (Test-Path $Api)) { throw "API file missing: $Api" }

Write-Host "[1/6] Replacing local API fallbacks..." -ForegroundColor Yellow

$Text = Get-Content $Api -Raw
$Text = $Text `
  -replace "'http://10\.0\.2\.2:3000'", "'https://supportcenter-kappa.vercel.app'" `
  -replace '"http://10\.0\.2\.2:3000"', '"https://supportcenter-kappa.vercel.app"' `
  -replace "'http://localhost:3000'", "'https://supportcenter-kappa.vercel.app'" `
  -replace '"http://localhost:3000"', '"https://supportcenter-kappa.vercel.app"' `
  -replace "'http://127\.0\.0\.1:3000'", "'https://supportcenter-kappa.vercel.app'" `
  -replace '"http://127\.0\.0\.1:3000"', '"https://supportcenter-kappa.vercel.app"'

Set-Content -Path $Api -Value $Text -Encoding UTF8

$ApiText = Get-Content $Api -Raw

if ($ApiText -match "10\.0\.2\.2|localhost:3000|127\.0\.0\.1:3000") {
    throw "Local API fallback still present in src/lib/api.ts"
}

if ($ApiText -notmatch "https://supportcenter-kappa\.vercel\.app") {
    throw "Production Vercel API URL missing."
}

Write-Host "PASS: APK API fallback is production HTTPS." -ForegroundColor Green

Write-Host "[2/6] Verifying EAS environment..." -ForegroundColor Yellow

$Eas = Join-Path $Mobile "eas.json"
$EasText = Get-Content $Eas -Raw

if ($EasText -notmatch "EXPO_PUBLIC_API_BASE_URL") {
    throw "EAS public API URL missing."
}

if ($EasText -notmatch "https://supportcenter-kappa\.vercel\.app") {
    throw "EAS Vercel URL missing."
}

Write-Host "PASS: EAS preview/production builds use Vercel API." -ForegroundColor Green

Write-Host "[3/6] Verifying native splash..." -ForegroundColor Yellow

$AppJson = Join-Path $Mobile "app.json"
$AppText = Get-Content $AppJson -Raw

if ($AppText -match "support-command-center-logo-transparent\.png") {
    throw "Native splash still contains branded login logo."
}

Write-Host "PASS: Native splash is plain; custom animated splash remains branded." -ForegroundColor Green

Write-Host "[4/6] Verifying launcher icon..." -ForegroundColor Yellow

if ($AppText -notmatch '"foregroundImage": "\./assets/brand/app-icon\.png"') {
    throw "Adaptive launcher icon is not using app-icon.png."
}

Write-Host "PASS: Android launcher icon uses current app brand icon." -ForegroundColor Green

Write-Host "[5/6] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Mobile TypeScript failed." }

Write-Host "[6/6] Expo config..." -ForegroundColor Yellow
npx expo config --type public | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Expo config validation failed." }

Write-Host ""
Write-Host "PASS: Phase 18.6 APK Production Runtime Fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "A NEW APK build is required:"
Write-Host "  eas build -p android --profile preview --clear-cache"
