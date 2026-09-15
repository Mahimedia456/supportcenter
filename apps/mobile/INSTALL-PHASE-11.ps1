$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 11 Feedback + Team" -ForegroundColor Cyan
Write-Host "CSAT, bad feedback drill-down, team workload, agent detail"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

Write-Host "Resolved root: $Root" -ForegroundColor DarkGray

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

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

Write-Host "[3/3] Phase 11 files verified." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: restart backend because /zendesk/satisfaction was added."
Write-Host ""
Write-Host "Terminal 1: cd E:\Supportcenter\backend ; npm run start:dev"
Write-Host "Terminal 2: cd E:\Supportcenter\apps\mobile ; npx expo start -c"
