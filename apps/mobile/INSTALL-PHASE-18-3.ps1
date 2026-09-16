$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 18.3 Atomos Fields Final" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path missing." }
if (-not (Test-Path $Backend)) { throw "Backend path missing." }

Write-Host "[1/5] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Mobile TypeScript failed." }

Write-Host "[2/5] Backend TypeScript..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Backend TypeScript failed." }

Write-Host "[3/5] Verifying Atomos field roles..." -ForegroundColor Yellow
$Mapper = Join-Path $Mobile "src\lib\zendesk-dimensions.ts"
$Text = Get-Content $Mapper -Raw

foreach ($Name in @("supportType", "faultCategory", "category", "rma", "device", "region")) {
    if ($Text -notmatch $Name) {
        throw "Missing semantic field role: $Name"
    }
}

Write-Host "PASS: Atomos custom-field mapping installed." -ForegroundColor Green

Write-Host "[4/5] Verifying ticket detail header..." -ForegroundColor Yellow
$Ticket = Join-Path $Mobile "src\app\ticket\[id].tsx"
$TicketText = Get-Content -LiteralPath $Ticket -Raw

if ($TicketText -notmatch "SafeAreaView") { throw "Ticket SafeAreaView missing." }
if ($TicketText -notmatch "chevron-back") { throw "Ticket back icon missing." }

Write-Host "PASS: Ticket detail header installed." -ForegroundColor Green

Write-Host "[5/5] Ready." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 18.3 Atomos field aggregation installed." -ForegroundColor Green
Write-Host ""
Write-Host "After Git push/Vercel redeploy inspect:"
Write-Host "  https://supportcenter-kappa.vercel.app/api/zendesk-diagnose"
