$ErrorActionPreference = "Stop"
Set-Location "E:\Supportcenter\backend"

Write-Host "[1/2] Checking database..." -ForegroundColor Yellow
npm run db:check
if ($LASTEXITCODE -ne 0) { throw "Database check failed. Do not continue until SUPABASE_DATABASE_URL is fixed." }

Write-Host "[2/2] Seeding Phase 02 users/workspaces..." -ForegroundColor Yellow
npm run seed:phase02
if ($LASTEXITCODE -ne 0) { throw "Seed failed." }

Write-Host "PASS: DB + seed ready." -ForegroundColor Green
Write-Host "Now run: npm run start:dev" -ForegroundColor Cyan
