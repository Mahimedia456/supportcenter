$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 21.2.1 Installer HOME Variable Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

Write-Host "[1/3] Verifying Home date filter compatibility..." -ForegroundColor Yellow

$Filter = Join-Path $Mobile "src\components\overview\OverviewDateFilter.tsx"
$Text = Read-AllText $Filter

foreach ($Term in @("period?: any", "from?: Date", "to?: Date", "onPreset?: (value: any)", "onCustom?: (from: Date, to: Date)")) {
    if ($Text -notmatch [regex]::Escape($Term)) {
        throw "Missing compatibility contract: $Term"
    }
}

Write-Host "PASS: Home period/from/to contract supported." -ForegroundColor Green

Write-Host "[2/3] Verifying current Home usage..." -ForegroundColor Yellow

$HomeScreen = Join-Path $Mobile "src\app\(tabs)\index.tsx"
$HomeScreenText = Read-AllText $HomeScreen

if ($HomeScreenText -notmatch "period=\{period\}") {
    throw "Current Home period prop not found."
}

if ($HomeScreenText -notmatch "onCustom=") {
    throw "Current Home custom date callback not found."
}

Write-Host "PASS: Existing Home implementation preserved." -ForegroundColor Green

Write-Host "[3/3] Mobile TypeScript..." -ForegroundColor Yellow

Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript still has errors."
}

Write-Host ""
Write-Host "PASS: Phase 21.2.1 TypeScript clean." -ForegroundColor Green
Write-Host "Now git commit/push is safe."
