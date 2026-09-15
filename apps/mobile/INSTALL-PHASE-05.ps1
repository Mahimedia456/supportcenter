$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Backend = Join-Path $Root 'backend'

Write-Host 'Support Command Center - Phase 05 DB Connectivity Guard' -ForegroundColor Cyan
Write-Host '[1/3] Mobile TypeScript check...'
Push-Location $PSScriptRoot
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw 'Mobile TypeScript check failed.' }
Pop-Location

Write-Host '[2/3] Backend TypeScript check...'
Push-Location $Backend
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Backend TypeScript check failed.' }

Write-Host '[3/3] Database connectivity check...'
npm run db:check
if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'Database is not configured/reachable yet.' -ForegroundColor Yellow
  Write-Host 'Run this from E:\Supportcenter\backend:' -ForegroundColor Yellow
  Write-Host 'powershell -ExecutionPolicy Bypass -File .\scripts\configure-supabase-pooler.ps1' -ForegroundColor White
  Pop-Location
  exit 2
}
Pop-Location
Write-Host 'PASS: Phase 05 checks completed.' -ForegroundColor Green
