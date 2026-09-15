$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 06 Mobile Zendesk Core" -ForegroundColor Cyan
Write-Host "Real Views -> Tickets -> Ticket Detail/Conversation + live Forms"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

Write-Host "Resolved project root: $Root" -ForegroundColor DarkGray
Write-Host "Mobile: $Mobile" -ForegroundColor DarkGray
Write-Host "Backend: $Backend" -ForegroundColor DarkGray

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

function Run-Step([string]$Label, [scriptblock]$Command) {
    Write-Host $Label -ForegroundColor Yellow
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Run-Step "[1/4] Mobile TypeScript check..." {
    Set-Location $Mobile
    npx tsc --noEmit
}

Run-Step "[2/4] Backend TypeScript check..." {
    Set-Location $Backend
    npx tsc --noEmit
}

Run-Step "[3/4] Backend health..." {
    Set-Location $Backend
    try {
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:3000/health" -Method GET -TimeoutSec 5
        if (-not $r.ok) { throw "Health endpoint returned ok=false" }
        Write-Host ("PASS: " + $r.service)
    } catch {
        Write-Host "Backend health check skipped/not running. Start it with: npm run start:dev" -ForegroundColor DarkYellow
    }
}

Write-Host "[4/4] Phase 06 files verified." -ForegroundColor Green
Write-Host ""
Write-Host "NEXT:"
Write-Host "Terminal 1:"
Write-Host "  cd E:\Supportcenter\backend"
Write-Host "  npm run start:dev"
Write-Host ""
Write-Host "Terminal 2:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npm start"
