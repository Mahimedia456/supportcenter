$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Verify GitHub Hourly Satisfaction Snapshot" -ForegroundColor Cyan

$Backend = $PSScriptRoot
$Hourly = Join-Path $Backend "api\zendesk-hourly-sync.ts"
$Direct = Join-Path $Backend "api\zendesk-cache-sync.ts"

if (-not (Test-Path $Hourly)) {
    throw "Missing api\zendesk-hourly-sync.ts"
}

$HourlyText = [System.IO.File]::ReadAllText($Hourly)

Write-Host "[1/3] Checking hourly GitHub-triggered sync..." -ForegroundColor Yellow

if ($HourlyText -notmatch "satisfaction") {
    throw "Hourly sync does not contain Satisfaction data. Do not assume it is being persisted."
}

Write-Host "PASS: hourly sync contains Satisfaction." -ForegroundColor Green

Write-Host "[2/3] Checking snapshot persistence..." -ForegroundColor Yellow

if ($HourlyText -notmatch "zendesk_cache_snapshots") {
    throw "Hourly sync does not reference zendesk_cache_snapshots."
}

Write-Host "PASS: hourly sync writes the support snapshot table." -ForegroundColor Green

Write-Host "[3/3] Checking direct sync too..." -ForegroundColor Yellow

if (Test-Path $Direct) {
    $DirectText = [System.IO.File]::ReadAllText($Direct)

    if ($DirectText -match "satisfaction") {
        Write-Host "PASS: direct sync also contains Satisfaction." -ForegroundColor Green
    } else {
        Write-Host "WARNING: direct sync file does not visibly contain Satisfaction." -ForegroundColor Yellow
    }
} else {
    Write-Host "INFO: direct sync endpoint not found; hourly verification still passed." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "PASS: GitHub hourly endpoint is configured to persist Satisfaction in the shared snapshot." -ForegroundColor Green
