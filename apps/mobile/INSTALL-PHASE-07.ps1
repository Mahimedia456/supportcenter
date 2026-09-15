$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 07 Advanced Tickets UX" -ForegroundColor Cyan
Write-Host "Professional light + refined green + cyan + controlled lime design"

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

Run-Step "[1/2] Mobile TypeScript check..." {
    Set-Location $Mobile
    npx tsc --noEmit
}

Run-Step "[2/2] Backend TypeScript check..." {
    Set-Location $Backend
    npx tsc --noEmit
}

Write-Host ""
Write-Host "PASS: Phase 07 installed and verified." -ForegroundColor Green
Write-Host ""
Write-Host "Run:"
Write-Host "Terminal 1: cd E:\Supportcenter\backend ; npm run start:dev"
Write-Host "Terminal 2: cd E:\Supportcenter\apps\mobile ; npm start"
