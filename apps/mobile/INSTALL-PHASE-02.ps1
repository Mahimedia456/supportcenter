$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Support Command Center - Phase 02" -ForegroundColor Cyan
Write-Host "Mobile + Backend Auth / Workspace Foundation" -ForegroundColor Cyan
Write-Host ""

$MobileDir = $PSScriptRoot
$RootDir = Resolve-Path (Join-Path $MobileDir "..\..")
$BackendDir = Join-Path $RootDir "backend"

Write-Host "[1/4] Mobile dependencies..." -ForegroundColor Yellow
Set-Location $MobileDir
npm install
npx expo install expo-secure-store expo-router expo-status-bar

if (!(Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created mobile .env from .env.example" -ForegroundColor Green
}

Write-Host "[2/4] Backend dependencies..." -ForegroundColor Yellow
Set-Location $BackendDir
npm install

if (!(Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created backend .env from .env.example" -ForegroundColor Green
}

Write-Host "[3/4] Type checks..." -ForegroundColor Yellow
Set-Location $MobileDir
npx tsc --noEmit

Set-Location $BackendDir
npx tsc --noEmit

Write-Host "[4/4] Done." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Fill backend\.env with SUPABASE_DATABASE_URL + JWT secrets."
Write-Host "2. Set AAMIR_PASSWORD and SHAHID_PASSWORD in backend\.env."
Write-Host "3. Run SQL: backend\sql\PHASE_02_AUTH_SCHEMA.sql in Supabase SQL Editor."
Write-Host "4. Run: cd E:\Supportcenter\backend ; npm run seed:phase02"
Write-Host "5. Run backend: npm run start:dev"
Write-Host "6. Set apps\mobile\.env EXPO_PUBLIC_API_BASE_URL to your PC/backend URL."
Write-Host "7. Run mobile: cd E:\Supportcenter\apps\mobile ; npm start"
Write-Host ""
