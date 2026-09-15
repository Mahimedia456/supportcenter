$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 11.1 Expo Router Typed Route Fix" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

$DevicesFile = Join-Path $Mobile "src\app\(tabs)\devices.tsx"
$InsightsFile = Join-Path $Mobile "src\app\(tabs)\insights.tsx"

if (-not (Test-Path $DevicesFile)) { throw "Missing file: $DevicesFile" }
if (-not (Test-Path $InsightsFile)) { throw "Missing file: $InsightsFile" }

function Patch-ExpoHref([string]$FilePath, [string]$Pathname) {
    $content = Get-Content $FilePath -Raw

    if ($content -match "import\s+\{\s*router\s*\}\s+from\s+'expo-router';") {
        $content = $content -replace `
            "import\s+\{\s*router\s*\}\s+from\s+'expo-router';", `
            "import { router, type Href } from 'expo-router';"
    }
    elseif ($content -match "import\s+\{\s*router\s*,\s*type Href\s*\}\s+from\s+'expo-router';") {
        # already patched
    }
    elseif ($content -match "from\s+'expo-router';" -and $content -notmatch "type Href") {
        $content = $content -replace `
            "import\s+\{([^}]*)\}\s+from\s+'expo-router';", `
            "import {`$1, type Href } from 'expo-router';"
    }

    $escaped = [regex]::Escape("pathname: '$Pathname',")
    if ($content -match $escaped -and $content -notmatch [regex]::Escape("} as Href);")) {
        $pattern = "router\.push\(\{\s*pathname:\s*'" + [regex]::Escape($Pathname) + "',\s*params:\s*\{([^}]*)\},\s*\}\);"
        $replacement = "router.push({`r`n      pathname: '$Pathname',`r`n      params: {`$1},`r`n    } as Href);"
        $content = [regex]::Replace($content, $pattern, $replacement)
    }

    Set-Content -Path $FilePath -Value $content -Encoding UTF8
}

Write-Host "[1/4] Patching Device detail route..." -ForegroundColor Yellow
Patch-ExpoHref $DevicesFile "/device/[name]"

Write-Host "[2/4] Patching Agent detail route..." -ForegroundColor Yellow
Patch-ExpoHref $InsightsFile "/agent/[id]"

Write-Host "[3/4] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[4/4] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host ""
Write-Host "PASS: Phase 11.1 typed-route fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "Now rerun:"
Write-Host "cd E:\Supportcenter\apps\mobile"
Write-Host ".\INSTALL-PHASE-11.ps1"
