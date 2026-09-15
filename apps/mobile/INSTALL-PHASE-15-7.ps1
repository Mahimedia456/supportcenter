$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.7 StyleSheet Absolute Fill Fix" -ForegroundColor Cyan
Write-Host "Fixes React Native absoluteFillObject typing mismatch"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"
$Login = Join-Path $Mobile "src\app\(auth)\login.tsx"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }
if (-not (Test-Path $Login)) { throw "Login screen not found: $Login" }

Write-Host "[1/3] Patching StyleSheet absolute fill..." -ForegroundColor Yellow

$content = Get-Content $Login -Raw

$content = $content -replace `
    "\.\.\.StyleSheet\.absoluteFillObject,", `
    "position: 'absolute',`r`n    top: 0,`r`n    right: 0,`r`n    bottom: 0,`r`n    left: 0,"

Set-Content -Path $Login -Value $content -Encoding UTF8

$verify = Get-Content $Login -Raw

if ($verify -match "absoluteFillObject") {
    throw "absoluteFillObject is still present."
}

Write-Host "PASS: login background fill patched." -ForegroundColor Green

Write-Host "[2/3] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[3/3] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host ""
Write-Host "PASS: Phase 15.7 absolute fill fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "No previous Phase 15 installer needs to be rerun." -ForegroundColor DarkYellow
Write-Host ""
Write-Host "Start mobile:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
