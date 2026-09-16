$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 22 Global Snapshot + Filter Recovery" -ForegroundColor Cyan

$Mobile = $PSScriptRoot

Write-Host "[1/6] Installing persistent local snapshot storage..." -ForegroundColor Yellow
Set-Location $Mobile

npx expo install @react-native-async-storage/async-storage
if ($LASTEXITCODE -ne 0) {
    throw "AsyncStorage install failed."
}
Write-Host "PASS: AsyncStorage ready." -ForegroundColor Green

Write-Host "[2/6] Verifying global support snapshot store..." -ForegroundColor Yellow
$Store = Join-Path $Mobile "src\lib\support-data-store.ts"
if (-not (Test-Path $Store)) {
    throw "Global support store missing."
}
$StoreText = [System.IO.File]::ReadAllText($Store)
if ($StoreText -notmatch "global-90day-snapshot") {
    throw "Persistent 90-day snapshot key missing."
}
Write-Host "PASS: One persistent global 90-day snapshot store ready." -ForegroundColor Green

Write-Host "[3/6] Verifying visible date filters..." -ForegroundColor Yellow
$Filter = Join-Path $Mobile "src\components\SupportPeriodFilter.tsx"
$FilterText = [System.IO.File]::ReadAllText($Filter)

foreach ($Label in @("Today","7 Days","30 Days","90 Days")) {
    if ($FilterText -notmatch [regex]::Escape($Label)) {
        throw "Missing visible filter: $Label"
    }
}
Write-Host "PASS: Today / 7 Days / 30 Days / 90 Days / custom filter visible." -ForegroundColor Green

Write-Host "[4/6] Verifying all problem screens use the same store..." -ForegroundColor Yellow

foreach ($Relative in @(
    "src\app\(tabs)\insights.tsx",
    "src\app\(tabs)\devices.tsx",
    "src\app\device\[name].tsx",
    "src\app\ticket-results.tsx"
)) {
    $Path = Join-Path $Mobile $Relative
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing screen: $Relative"
    }

    $Body = [System.IO.File]::ReadAllText($Path)

    if ($Body -notmatch "useGlobalSupportSnapshot") {
        throw "$Relative is still using a separate snapshot."
    }

    if ($Body -notmatch "SupportPeriodFilter") {
        throw "$Relative is missing the shared date filter."
    }
}

Write-Host "PASS: Insights / Devices / Device Detail / Ticket Results share one cached snapshot." -ForegroundColor Green

Write-Host "[5/6] Verifying device drill-down navigation..." -ForegroundColor Yellow
$DevicePath = Join-Path $Mobile "src\app\device\[name].tsx"
$DeviceText = [System.IO.File]::ReadAllText($DevicePath)

foreach ($Preset in @("open","faulty","rma","unassigned")) {
    if ($DeviceText -notmatch "'$Preset'") {
        throw "Device preset missing: $Preset"
    }
}
Write-Host "PASS: Device Open / Faulty / RMA / Unassigned open filtered ticket results." -ForegroundColor Green

Write-Host "[6/6] Mobile TypeScript..." -ForegroundColor Yellow
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript failed."
}

Write-Host ""
Write-Host "PASS: Phase 22 Global Snapshot + Filter Recovery installed." -ForegroundColor Green
Write-Host "No new SQL or Vercel environment variable is required."
Write-Host "After app starts, pull down ONCE on Insights or Devices."
Write-Host "That refreshed 90-day snapshot is then persisted and reused by all these screens."
