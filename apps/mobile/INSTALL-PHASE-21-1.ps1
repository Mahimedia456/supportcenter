$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 21.1 TypeScript Fix" -ForegroundColor Cyan

$Mobile = $PSScriptRoot

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

function Write-AllText([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText(
        $Path,
        $Content,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

Write-Host "[1/4] Fixing Device detail callback typing..." -ForegroundColor Yellow

$Device = Join-Path $Mobile "src\app\device\[name].tsx"
if (Test-Path -LiteralPath $Device) {
    $Text = Read-AllText $Device

    $Text = $Text `
      -replace "\.map\(\(item\)\s*=>", ".map((item: string) =>"

    Write-AllText $Device $Text
}

Write-Host "PASS: Device callback typed." -ForegroundColor Green

Write-Host "[2/4] Fixing Ticket Results callback typing..." -ForegroundColor Yellow

$Results = Join-Path $Mobile "src\app\ticket-results.tsx"
if (Test-Path $Results) {
    $Text = Read-AllText $Results

    $Text = $Text `
      -replace "\.map\(\(item\)\s*=>", ".map((item: string) =>"

    Write-AllText $Results $Text
}

Write-Host "PASS: Ticket Results callback typed." -ForegroundColor Green

Write-Host "[3/4] Verifying Home date-filter contract..." -ForegroundColor Yellow

$Filter = Join-Path $Mobile "src\components\overview\OverviewDateFilter.tsx"
$FilterText = Read-AllText $Filter

if ($FilterText -notmatch "onPreset\?: \(value: OverviewPreset\)") {
    throw "OverviewDateFilter onPreset contract missing."
}

if ($FilterText -notmatch "onCustom\?: \(from: string, to: string\)") {
    throw "OverviewDateFilter onCustom(from,to) contract missing."
}

Write-Host "PASS: Home onPreset/onCustom contract restored." -ForegroundColor Green

Write-Host "[4/4] Mobile TypeScript..." -ForegroundColor Yellow

Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript still has errors."
}

Write-Host ""
Write-Host "PASS: Phase 21.1 TypeScript fix complete." -ForegroundColor Green
Write-Host "Now you can git add / commit / push."
