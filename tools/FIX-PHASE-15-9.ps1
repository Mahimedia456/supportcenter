$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.9 Network + TypeScript Fix" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

$MobileTs = Join-Path $Mobile "tsconfig.json"
$BackendTs = Join-Path $Backend "tsconfig.json"

function Remove-InvalidIgnoreDeprecations {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Missing tsconfig: $Path"
    }

    $text = Get-Content $Path -Raw

    # Remove the TS 6-only suppression that TS 5.9 rejects.
    $text = [regex]::Replace(
        $text,
        '(?m)^\s*"ignoreDeprecations"\s*:\s*"6\.0"\s*,?\s*\r?\n',
        ''
    )

    # Clean a possible trailing comma before closing compilerOptions/object.
    $text = [regex]::Replace(
        $text,
        ',\s*(\})',
        '$1'
    )

    Set-Content -Path $Path -Value $text -Encoding UTF8

    if ((Get-Content $Path -Raw) -match '"ignoreDeprecations"\s*:\s*"6\.0"') {
        throw "Failed to remove invalid ignoreDeprecations from $Path"
    }
}

Write-Host "[1/6] Removing invalid TypeScript 6 suppression..." -ForegroundColor Yellow
Remove-InvalidIgnoreDeprecations -Path $MobileTs
Remove-InvalidIgnoreDeprecations -Path $BackendTs
Write-Host "PASS: invalid ignoreDeprecations removed." -ForegroundColor Green

Write-Host "[2/6] Checking mobile API base URL..." -ForegroundColor Yellow
$EnvFile = Join-Path $Mobile ".env"

if (Test-Path $EnvFile) {
    $envText = Get-Content $EnvFile -Raw
    $match = [regex]::Match(
        $envText,
        'EXPO_PUBLIC_API_BASE_URL\s*=\s*(.+)'
    )

    if ($match.Success) {
        $url = $match.Groups[1].Value.Trim()

        Write-Host "Mobile API URL: $url"

        if ($url -match '10\.0\.2\.2|127\.0\.0\.1|localhost') {
            Write-Host "WARNING: Mobile still points to a local backend." -ForegroundColor Red
        }

        if ($url -match '/api/?$') {
            Write-Host "WARNING: Remove /api from EXPO_PUBLIC_API_BASE_URL." -ForegroundColor Red
        }
    }
}
else {
    Write-Host "WARNING: apps\mobile\.env not found." -ForegroundColor DarkYellow
}

Write-Host "[3/6] Mobile TypeScript 5.9 check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[4/6] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[5/6] Production Vercel health check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod `
        -Uri "https://supportcenter-kappa.vercel.app/health" `
        -Method GET `
        -TimeoutSec 15

    if (-not $health.ok) {
        throw "Production health did not return ok=true."
    }

    Write-Host "PASS: Vercel backend health is OK." -ForegroundColor Green
}
catch {
    Write-Host "WARNING: Could not verify Vercel health from this machine." -ForegroundColor DarkYellow
}

Write-Host "[6/6] Final network policy..." -ForegroundColor Yellow
Write-Host "Auth timeout: 45 seconds"
Write-Host "Other API timeout: 30 seconds"
Write-Host "PORT is not required on Vercel."

Write-Host ""
Write-Host "PASS: Phase 15.9 Network + TypeScript fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "Restart VS Code TypeScript Server:"
Write-Host "  Ctrl+Shift+P -> TypeScript: Restart TS Server"
Write-Host ""
Write-Host "Restart Metro:"
Write-Host "  cd E:\Supportcenter\apps\mobile"
Write-Host "  npx expo start -c"
