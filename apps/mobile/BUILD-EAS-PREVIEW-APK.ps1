$ErrorActionPreference = "Stop"

$ProjectRoot = "E:\Supportcenter\apps\mobile"
Set-Location $ProjectRoot

Write-Host "Support Command Center - EAS Standalone Preview APK" -ForegroundColor Cyan

if (-not (Test-Path ".\package.json")) {
    throw "package.json not found in $ProjectRoot"
}

Write-Host "[1/4] TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "TypeScript check failed." }

Write-Host "[2/4] Expo config check..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
npx expo config --type public | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Expo config check failed." }

Write-Host "[3/4] EAS account..." -ForegroundColor Yellow
npx eas-cli@latest whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "EAS login required." -ForegroundColor Yellow
    npx eas-cli@latest login
    if ($LASTEXITCODE -ne 0) { throw "EAS login failed." }
}

Write-Host "[4/4] Building standalone preview APK in Expo/EAS cloud..." -ForegroundColor Yellow
npx eas-cli@latest build --platform android --profile preview
if ($LASTEXITCODE -ne 0) { throw "EAS preview APK build failed." }

Write-Host ""
Write-Host "PASS: EAS build submitted/completed." -ForegroundColor Green
Write-Host "This preview APK is standalone and does NOT need Expo Go, Metro, or expo start." -ForegroundColor Green
