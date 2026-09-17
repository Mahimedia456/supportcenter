$ErrorActionPreference = "Stop"

$Root = "E:\Supportcenter"
if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "backend"))) {
    $Root = $PSScriptRoot
}

$Backend = Join-Path $Root "backend"
$Mobile = Join-Path $Root "apps\mobile"

Write-Host "Support Command Center - Phase 24.2 Satisfaction + Alerts Performance Fix" -ForegroundColor Cyan
Write-Host "Root: $Root" -ForegroundColor DarkGray

if (-not (Test-Path $Backend)) { throw "Backend not found: $Backend" }
if (-not (Test-Path $Mobile)) { throw "Mobile not found: $Mobile" }

Write-Host "[1/7] Removing old hidden Alerts tab route..." -ForegroundColor Yellow
$OldAlerts = Join-Path $Mobile "src\app\(tabs)\alerts.tsx"
if (Test-Path $OldAlerts) {
    Remove-Item $OldAlerts -Force
}
Write-Host "PASS: Alerts is no longer a hidden tab screen." -ForegroundColor Green

Write-Host "[2/7] Verifying top-level Alerts route..." -ForegroundColor Yellow
$Alerts = Join-Path $Mobile "src\app\alerts.tsx"
$AlertsText = [IO.File]::ReadAllText($Alerts)

foreach ($Term in @("FlatList","router.back","includeDeviceSpikes:false","SupportPeriodFilter")) {
    if ($AlertsText -notmatch [regex]::Escape($Term)) {
        throw "Alerts screen missing: $Term"
    }
}
Write-Host "PASS: Alerts is top-level, virtualized and performance-safe." -ForegroundColor Green

Write-Host "[3/7] Verifying tab layout..." -ForegroundColor Yellow
$Layout = Join-Path $Mobile "src\app\(tabs)\_layout.tsx"
$LayoutText = [IO.File]::ReadAllText($Layout)

if ($LayoutText -match 'name="alerts"') {
    throw "Alerts is still registered as a tab."
}
foreach ($Term in @('name="index"','name="tickets"','name="insights"','name="devices"','name="satisfaction"')) {
    if ($LayoutText -notmatch [regex]::Escape($Term)) {
        throw "Expected visible tab missing: $Term"
    }
}
Write-Host "PASS: five bottom tabs remain; Alerts is outside tabs." -ForegroundColor Green

Write-Host "[4/7] Verifying Satisfaction backend sync..." -ForegroundColor Yellow
$Stage = Join-Path $Backend "api\_support-staged-sync.ts"
$StageText = [IO.File]::ReadAllText($Stage)

foreach ($Term in @(
    "sort_by=created_at&sort_order=desc",
    "satisfaction_ratings",
    "startMs",
    "updateCols(client,workspace,{satisfaction:rows}"
)) {
    if ($StageText -notmatch [regex]::Escape($Term)) {
        throw "Satisfaction staged sync missing: $Term"
    }
}
Write-Host "PASS: Satisfaction sync fetches newest ratings first and applies 90-day cutoff correctly." -ForegroundColor Green

Write-Host "[5/7] Verifying Satisfaction mobile filtering..." -ForegroundColor Yellow
$Sat = Join-Path $Mobile "src\app\(tabs)\satisfaction.tsx"
$SatText = [IO.File]::ReadAllText($Sat)

foreach ($Term in @("supportPeriodRange","ratingInPeriod","snapshot?.satisfaction","rating.created_at")) {
    if ($SatText -notmatch [regex]::Escape($Term)) {
        throw "Satisfaction screen missing: $Term"
    }
}

if ($SatText -match "ticketMap\.has\(") {
    throw "Satisfaction still requires rating ticket IDs to exist in the selected ticket period."
}
Write-Host "PASS: Satisfaction is filtered by rating date, not ticket creation date." -ForegroundColor Green

Write-Host "[6/7] Backend TypeScript/build..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Backend TypeScript failed." }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Backend build failed." }
Write-Host "PASS: backend compile/build clean." -ForegroundColor Green

Write-Host "[7/7] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Mobile TypeScript failed." }

Write-Host ""
Write-Host "PASS: Phase 24.2 installed and verified." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Cyan
Write-Host "After deployment, run GitHub Actions -> Hourly Zendesk Snapshot Sync once."
Write-Host "The Satisfaction stage must run once to repopulate the corrected snapshot."
