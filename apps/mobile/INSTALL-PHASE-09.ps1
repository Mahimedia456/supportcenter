$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 09 Forms + Issues + Zendesk Field Mapping" -ForegroundColor Cyan
Write-Host "Real ticket forms, ticket fields, 30-day analytics, issue/device/region mapping"

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

Write-Host "[3/3] Phase 09 files verified." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Restart the Nest backend because Zendesk routes changed."
Write-Host ""
Write-Host "Terminal 1:"
Write-Host "  cd E:\Supportcenter\backend"
Write-Host "  npm run start:dev"
Write-Host ""
Write-Host "Terminal 2:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
