$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 05.1 SSL/Pooler Fix" -ForegroundColor Cyan
Write-Host "Fixing Supabase pooler SELF_SIGNED_CERT_IN_CHAIN in DB check, seed, and NestJS runtime."

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

function Run-Step([string]$Label, [scriptblock]$Command) {
    Write-Host $Label -ForegroundColor Yellow
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Run-Step "[1/3] Mobile TypeScript check..." {
    Set-Location $Mobile
    npx tsc --noEmit
}

Run-Step "[2/3] Backend TypeScript check..." {
    Set-Location $Backend
    npx tsc --noEmit
}

Run-Step "[3/3] Supabase database check..." {
    Set-Location $Backend
    npm run db:check
}

Write-Host ""
Write-Host "PASS: Phase 05.1 patch verified." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT COMMANDS:"
Write-Host "cd E:\Supportcenter\backend"
Write-Host "npm run seed:phase02"
Write-Host "npm run start:dev"
