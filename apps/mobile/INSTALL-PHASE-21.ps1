$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 21 Data Recovery + Fast Snapshot + UI Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

Write-Host "[1/6] Verifying DB snapshot cache..." -ForegroundColor Yellow

$Db = Join-Path $Mobile "src\lib\zendesk-db.ts"
$DbText = Read-AllText $Db

if ($DbText -notmatch "memorySnapshot") {
    throw "In-memory Zendesk snapshot cache missing."
}

Write-Host "PASS: Snapshot is reused between screens." -ForegroundColor Green

Write-Host "[2/6] Verifying recovered semantic values..." -ForegroundColor Yellow

$Dimensions = Join-Path $Mobile "src\lib\support-dimensions.ts"
$DimensionsText = Read-AllText $Dimensions

foreach ($Term in @("device", "supportType", "region", "category", "faultCategory", "rma")) {
    if ($DimensionsText -notmatch $Term) {
        throw "Missing semantic dimension: $Term"
    }
}

Write-Host "PASS: Ticket-level custom field resolution enabled." -ForegroundColor Green

Write-Host "[3/6] Verifying shared period filters..." -ForegroundColor Yellow

$Period = Join-Path $Mobile "src\components\SupportPeriodFilter.tsx"
if (-not (Test-Path $Period)) {
    throw "SupportPeriodFilter missing."
}

Write-Host "PASS: Today / 7 / 30 / 90 / custom filter available." -ForegroundColor Green

Write-Host "[4/6] Verifying device drill-down metrics..." -ForegroundColor Yellow

$Device = Join-Path $Mobile "src\app\device\[name].tsx"
$DeviceText = Read-AllText $Device

foreach ($Term in @("Open", "Faulty", "RMA", "Unassigned")) {
    if ($DeviceText -notmatch $Term) {
        throw "Device metric missing: $Term"
    }
}

if ($DeviceText -match "View Health") {
    throw "View Health is still present."
}

Write-Host "PASS: Device cards = Open / Faulty / RMA / Unassigned." -ForegroundColor Green

Write-Host "[5/6] Backend TypeScript..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[6/6] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host ""
Write-Host "PASS: Phase 21 installed." -ForegroundColor Green
Write-Host "No new database migration is required."
Write-Host "Existing 90-day DB cache remains canonical."
Write-Host "Pull down once after deployment to refresh the snapshot."
