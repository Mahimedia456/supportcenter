$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Mobile Phase 23.2 Navigation + Satisfaction Snapshot" -ForegroundColor Cyan

$Mobile = $PSScriptRoot

Write-Host "[1/6] Removing old standalone Satisfaction route..." -ForegroundColor Yellow
$Old = Join-Path $Mobile "src\app\satisfaction.tsx"

if (Test-Path $Old) {
    Remove-Item $Old -Force
    Write-Host "PASS: old standalone Satisfaction route removed." -ForegroundColor Green
} else {
    Write-Host "PASS: no old standalone Satisfaction route found." -ForegroundColor Green
}

Write-Host "[2/6] Verifying bottom tabs..." -ForegroundColor Yellow
$Layout = Join-Path $Mobile "src\app\(tabs)\_layout.tsx"
$LayoutText = [System.IO.File]::ReadAllText($Layout)

foreach ($Term in @(
    'name="index"',
    'name="tickets"',
    'name="insights"',
    'name="devices"',
    'name="satisfaction"',
    'name="alerts"',
    'href: null'
)) {
    if ($LayoutText -notmatch [regex]::Escape($Term)) {
        throw "Tabs layout missing: $Term"
    }
}

Write-Host "PASS: Satisfaction is visible bottom tab; Alerts route is hidden from bottom bar." -ForegroundColor Green

Write-Host "[3/6] Verifying Alerts header shortcut..." -ForegroundColor Yellow
$Header = Join-Path $Mobile "src\components\WorkspaceHeader.tsx"
$HeaderText = [System.IO.File]::ReadAllText($Header)

foreach ($Term in @(
    "/alerts",
    "/profile",
    "notifications-outline"
)) {
    if ($HeaderText -notmatch [regex]::Escape($Term)) {
        throw "WorkspaceHeader missing: $Term"
    }
}

if ($HeaderText -match "/satisfaction") {
    throw "WorkspaceHeader still contains Satisfaction shortcut."
}

Write-Host "PASS: Alerts bell is beside Profile." -ForegroundColor Green

Write-Host "[4/6] Verifying Satisfaction shared snapshot..." -ForegroundColor Yellow
$Sat = Join-Path $Mobile "src\app\(tabs)\satisfaction.tsx"
$SatText = [System.IO.File]::ReadAllText($Sat)

foreach ($Term in @(
    "useGlobalSupportSnapshot",
    "snapshot?.satisfaction",
    "SupportPeriodFilter",
    "Total ratings",
    "Customer comments"
)) {
    if ($SatText -notmatch [regex]::Escape($Term)) {
        throw "Satisfaction tab missing: $Term"
    }
}

Write-Host "PASS: Satisfaction reads persisted shared snapshot." -ForegroundColor Green

Write-Host "[5/6] Mobile TypeScript..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host "[6/6] Complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 23.2 installed." -ForegroundColor Green
Write-Host "Bottom tabs: Overview / Tickets / Insights / Devices / Satisfaction" -ForegroundColor Green
Write-Host "Alerts: top bell beside Profile" -ForegroundColor Green
