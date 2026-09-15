$ErrorActionPreference = "Stop"
Write-Host "Support Command Center - Phase 03" -ForegroundColor Cyan
Write-Host "Fix Phase 02 + Zendesk Read-Only Views/Tickets/Forms" -ForegroundColor Cyan
$MobileDir=$PSScriptRoot
$RootDir=Resolve-Path (Join-Path $MobileDir "..\..")
$BackendDir=Join-Path $RootDir "backend"

Write-Host "[1/4] Mobile dependencies (Expo SDK 57 compatible)..." -ForegroundColor Yellow
Set-Location $MobileDir
npm install --legacy-peer-deps

if (!(Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Write-Host "[2/4] Backend dependencies..." -ForegroundColor Yellow
Set-Location $BackendDir
npm install
if (!(Test-Path ".env")) { Copy-Item ".env.example" ".env" }

Write-Host "[3/4] Type checks..." -ForegroundColor Yellow
Set-Location $MobileDir
npx tsc --noEmit
Set-Location $BackendDir
npx tsc --noEmit

Write-Host "[4/4] Done" -ForegroundColor Green
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "1. Paste the corrected backend .env values."
Write-Host "2. Run backend\sql\PHASE_02_AUTH_SCHEMA.sql in Supabase SQL Editor if not already run."
Write-Host "3. cd E:\Supportcenter\backend ; npm run db:check"
Write-Host "4. npm run seed:phase02"
Write-Host "5. npm run start:dev"
Write-Host "6. cd E:\Supportcenter\apps\mobile ; npm start"
