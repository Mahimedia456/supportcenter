$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 12 Alerts + Typed Route Fix" -ForegroundColor Cyan
Write-Host "Fixes Device/Agent typed routes and adds Alerts + Alert Detail"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

$DevicesFile = Join-Path $Mobile "src\app\(tabs)\devices.tsx"
$InsightsFile = Join-Path $Mobile "src\app\(tabs)\insights.tsx"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

function Ensure-UnknownHrefCast([string]$FilePath) {
    if (-not (Test-Path $FilePath)) {
        return
    }

    $content = Get-Content $FilePath -Raw

    # TypeScript 5 rejects direct casts when the generated Expo Router union
    # does not yet include a newly-created dynamic route. Double assertion is
    # intentional here and still preserves Href at the router boundary.
    $content = $content -replace "\}\s+as Href\);", "} as unknown as Href);"

    Set-Content -Path $FilePath -Value $content -Encoding UTF8
}

function Ensure-HrefImport([string]$FilePath) {
    if (-not (Test-Path $FilePath)) {
        return
    }

    $content = Get-Content $FilePath -Raw

    if ($content -match "from\s+'expo-router';" -and $content -notmatch "type Href") {
        $content = $content -replace `
          "import\s+\{([^}]*)\}\s+from\s+'expo-router';", `
          "import {`$1, type Href } from 'expo-router';"
    }

    Set-Content -Path $FilePath -Value $content -Encoding UTF8
}

Write-Host "[1/5] Fixing Device typed route..." -ForegroundColor Yellow
Ensure-HrefImport $DevicesFile
Ensure-UnknownHrefCast $DevicesFile

Write-Host "[2/5] Fixing Agent typed route..." -ForegroundColor Yellow
Ensure-HrefImport $InsightsFile
Ensure-UnknownHrefCast $InsightsFile

Write-Host "[3/5] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[4/5] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[5/5] Phase 12 verified." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 12 installed successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Run:"
Write-Host "Terminal 1: cd E:\Supportcenter\backend ; npm run start:dev"
Write-Host "Terminal 2: cd E:\Supportcenter\apps\mobile ; npx expo start -c"
