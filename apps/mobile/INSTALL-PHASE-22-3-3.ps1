$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 22.3.3 Remove All @vercel/node Type Imports" -ForegroundColor Cyan

$Mobile = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Backend = Join-Path $Root "backend"
$ApiDir = Join-Path $Backend "api"

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

function Write-AllText([string]$Path, [string]$Content) {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

Write-Host "[1/5] Scanning backend/api for @vercel/node imports..." -ForegroundColor Yellow

$Files = Get-ChildItem -Path $ApiDir -Filter "*.ts" -File -Recurse
$Patched = 0

foreach ($File in $Files) {
    $Text = Read-AllText $File.FullName
    $Original = $Text

    $Text = [regex]::Replace(
        $Text,
        "import\s+type\s*\{\s*VercelRequest\s*,\s*VercelResponse\s*\}\s*from\s*['""]@vercel/node['""];\s*",
        ""
    )

    $Text = [regex]::Replace(
        $Text,
        "import\s*\{\s*VercelRequest\s*,\s*VercelResponse\s*\}\s*from\s*['""]@vercel/node['""];\s*",
        ""
    )

    $Text = $Text -replace "req:\s*VercelRequest", "req: any"
    $Text = $Text -replace "res:\s*VercelResponse", "res: any"

    if ($Text -ne $Original) {
        Write-AllText $File.FullName $Text
        $Patched++
        Write-Host "PATCHED: $($File.Name)" -ForegroundColor DarkGray
    }
}

Write-Host "PASS: scanned $($Files.Count) API files; patched $Patched." -ForegroundColor Green

Write-Host "[2/5] Verifying no @vercel/node imports remain..." -ForegroundColor Yellow

$Remaining = @()

foreach ($File in $Files) {
    $Text = Read-AllText $File.FullName
    if ($Text -match "@vercel/node") {
        $Remaining += $File.FullName
    }
}

if ($Remaining.Count -gt 0) {
    $Remaining | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    throw "@vercel/node imports still remain."
}

Write-Host "PASS: no @vercel/node imports remain anywhere under backend/api." -ForegroundColor Green

Write-Host "[3/5] Verifying diagnose endpoint specifically..." -ForegroundColor Yellow

$Diagnose = Join-Path $ApiDir "zendesk-diagnose.ts"

if (Test-Path $Diagnose) {
    $DiagnoseText = Read-AllText $Diagnose

    if ($DiagnoseText -match "VercelRequest|VercelResponse|@vercel/node") {
        throw "zendesk-diagnose.ts still contains Vercel-specific types."
    }

    Write-Host "PASS: zendesk-diagnose.ts cleaned." -ForegroundColor Green
}

Write-Host "[4/5] Backend TypeScript..." -ForegroundColor Yellow

Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript failed."
}

Write-Host "[5/5] Backend production build..." -ForegroundColor Yellow

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "Backend production build failed."
}

Write-Host ""
Write-Host "PASS: Phase 22.3.3 complete." -ForegroundColor Green
Write-Host "Safe to commit and push."
