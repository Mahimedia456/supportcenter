$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 05.3 Schema + Seed Fix" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

Write-Host "Resolved project root: $Root" -ForegroundColor DarkGray
Write-Host "Mobile path: $Mobile" -ForegroundColor DarkGray
Write-Host "Backend path: $Backend" -ForegroundColor DarkGray

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

function Run-Step([string]$Label, [scriptblock]$Command) {
    Write-Host $Label -ForegroundColor Yellow
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Run-Step "[1/5] Mobile TypeScript check..." {
    Set-Location $Mobile
    npx tsc --noEmit
}

Run-Step "[2/5] Backend TypeScript check..." {
    Set-Location $Backend
    npx tsc --noEmit
}

Run-Step "[3/5] Supabase database check..." {
    Set-Location $Backend
    npm run db:check
}

Run-Step "[4/5] Apply auth/workspace schema..." {
    Set-Location $Backend
    npx tsx scripts/apply-phase02-schema.ts
}

Run-Step "[5/5] Seed manager users/workspaces..." {
    Set-Location $Backend
    npm run seed:phase02
}

Write-Host ""
Write-Host "PASS: Phase 05.3 complete." -ForegroundColor Green
Write-Host "Database schema exists and manager users are seeded."
Write-Host ""
Write-Host "NEXT:"
Write-Host "cd E:\Supportcenter\backend"
Write-Host "npm run start:dev"
