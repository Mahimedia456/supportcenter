$ErrorActionPreference = "Stop"

Write-Host "Support Command Center Backend - Phase 22.3.5 Diagnose Repair" -ForegroundColor Cyan

$Backend = $PSScriptRoot
$ApiDir = Join-Path $Backend "api"
$Diagnose = Join-Path $ApiDir "zendesk-diagnose.ts"

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

function Write-AllText([string]$Path, [string]$Content) {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

if (-not (Test-Path $Diagnose)) {
    throw "Missing: backend\api\zendesk-diagnose.ts"
}

Write-Host "[1/6] Backing up diagnose file..." -ForegroundColor Yellow

$Backup = "$Diagnose.phase2235.bak"
Copy-Item $Diagnose $Backup -Force

Write-Host "PASS: backup created." -ForegroundColor Green

Write-Host "[2/6] Repairing malformed Vercel import block..." -ForegroundColor Yellow

$Text = Read-AllText $Diagnose

# Remove any malformed import block at the beginning that was created from:
# import type { VercelRequest, VercelResponse } from '@vercel/node';
# after a previous unsafe global replacement.
$Text = [regex]::Replace(
    $Text,
    "(?ms)^\s*import\s+(?:type\s+)?\{\s*any\s*,\s*any\s*,?\s*\}\s*from\s*(?:['""][^'""]*['""])?\s*;?\s*",
    ""
)

$Text = [regex]::Replace(
    $Text,
    "(?ms)^\s*import\s+(?:type\s+)?\{\s*any\s*,\s*any\s*,?\s*\}\s*from\s*;\s*",
    ""
)

# Remove any remaining import statement that references @vercel/node.
$Text = [regex]::Replace(
    $Text,
    "(?ms)^\s*import\b[^;]*@vercel/node[^;]*;\s*",
    ""
)

# Remove any orphan broken `from ;` import fragment at top of file.
$Text = [regex]::Replace(
    $Text,
    "(?m)^\s*\}\s*from\s*;\s*$",
    ""
)

# Fix request/response annotations if any survived.
$Text = $Text -replace "\bVercelRequest\b", "any"
$Text = $Text -replace "\bVercelResponse\b", "any"

Write-AllText $Diagnose $Text

Write-Host "PASS: malformed Vercel import repaired." -ForegroundColor Green

Write-Host "[3/6] Fixing runtime imports accidentally marked as type-only..." -ForegroundColor Yellow

$Text = Read-AllText $Diagnose

# `clean` is used as a runtime value in this endpoint.
$Text = [regex]::Replace(
    $Text,
    "import\s+type\s*\{\s*clean\s*\}",
    "import { clean }"
)

# Also handle mixed import block where clean appears with other names.
$Text = [regex]::Replace(
    $Text,
    "import\s+type\s*\{([^}]*)\bclean\b([^}]*)\}",
    {
        param($m)
        "import {" + $m.Groups[1].Value + "clean" + $m.Groups[2].Value + "}"
    }
)

Write-AllText $Diagnose $Text

Write-Host "PASS: runtime clean import repaired." -ForegroundColor Green

Write-Host "[4/6] Verifying source before build..." -ForegroundColor Yellow

$Verify = Read-AllText $Diagnose

if ($Verify -match "@vercel/node") {
    throw "@vercel/node still exists in zendesk-diagnose.ts"
}

if ($Verify -match "import\s+(?:type\s+)?\{\s*any\s*,\s*any") {
    throw "Malformed any/any import still exists."
}

if ($Verify -match "\}\s*from\s*;") {
    throw "Broken 'from ;' syntax still exists."
}

if ($Verify -match "import\s+type\s*\{[^}]*\bclean\b") {
    throw "'clean' is still imported as type-only."
}

Write-Host "PASS: diagnose source validation clean." -ForegroundColor Green

Write-Host "[5/6] Backend TypeScript..." -ForegroundColor Yellow

Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "TypeScript failed. Backup remains at:" -ForegroundColor Red
    Write-Host $Backup -ForegroundColor Red
    throw "Backend TypeScript failed."
}

Write-Host "PASS: backend TypeScript clean." -ForegroundColor Green

Write-Host "[6/6] Backend production build..." -ForegroundColor Yellow

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Production build failed. Backup remains at:" -ForegroundColor Red
    Write-Host $Backup -ForegroundColor Red
    throw "Backend production build failed."
}

Write-Host ""
Write-Host "PASS: Backend Phase 22.3.5 Diagnose Repair complete." -ForegroundColor Green
Write-Host "Now commit/push from E:\Supportcenter."
