$ErrorActionPreference = "Stop"

Write-Host "Support Command Center Backend - Phase 22.3.6 Diagnose Surgical Fix" -ForegroundColor Cyan

$Backend = $PSScriptRoot
$Diagnose = Join-Path $Backend "api\zendesk-diagnose.ts"

function Read-AllText([string]$Path) {
    return [System.IO.File]::ReadAllText($Path)
}

function Write-AllText([string]$Path, [string]$Content) {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $Utf8NoBom)
}

if (-not (Test-Path $Diagnose)) {
    throw "Missing api\zendesk-diagnose.ts"
}

Write-Host "[1/7] Creating fresh backup..." -ForegroundColor Yellow

$Backup = "$Diagnose.phase2236.bak"
Copy-Item $Diagnose $Backup -Force

Write-Host "PASS: backup created." -ForegroundColor Green

Write-Host "[2/7] Removing malformed any/any import block..." -ForegroundColor Yellow

$Text = Read-AllText $Diagnose

# Exact malformed block produced by previous unsafe Vercel type replacement:
# import type {
#   any,
#   any,
# } from ...;
$Text = [regex]::Replace(
    $Text,
    "(?ms)^\s*import\s+(?:type\s+)?\{\s*any\s*,\s*any\s*,?\s*\}\s*from\s*(?:['""][^'""]*['""])?\s*;?\s*",
    ""
)

# Variant with orphan `from ;`
$Text = [regex]::Replace(
    $Text,
    "(?ms)^\s*import\s+(?:type\s+)?\{\s*any\s*,\s*any\s*,?\s*\}\s*from\s*;\s*",
    ""
)

# If the malformed block has extra whitespace/comments between the two anys.
$Text = [regex]::Replace(
    $Text,
    "(?ms)^\s*import\s+(?:type\s+)?\{(?:(?!\}).)*\bany\b(?:(?!\}).)*\bany\b(?:(?!\}).)*\}\s*from\s*(?:['""][^'""]*['""])?\s*;?\s*",
    ""
)

Write-AllText $Diagnose $Text

Write-Host "PASS: malformed import block removed." -ForegroundColor Green

Write-Host "[3/7] Removing residual Vercel/orphan syntax..." -ForegroundColor Yellow

$Text = Read-AllText $Diagnose

# Remove any remaining import statement that still references @vercel/node.
$Text = [regex]::Replace(
    $Text,
    "(?ms)^\s*import\b[^;]*@vercel/node[^;]*;\s*",
    ""
)

# Remove orphan broken lines left from malformed imports.
$Text = [regex]::Replace(
    $Text,
    "(?m)^\s*\}\s*from\s*;\s*$",
    ""
)

$Text = [regex]::Replace(
    $Text,
    "(?m)^\s*from\s*;\s*$",
    ""
)

# Request/response annotations may still exist elsewhere.
$Text = $Text -replace "\bVercelRequest\b", "any"
$Text = $Text -replace "\bVercelResponse\b", "any"

Write-AllText $Diagnose $Text

Write-Host "PASS: residual Vercel/orphan syntax removed." -ForegroundColor Green

Write-Host "[4/7] Validating repaired source..." -ForegroundColor Yellow

$Verify = Read-AllText $Diagnose

if ($Verify -match "@vercel/node") {
    throw "@vercel/node still present."
}

if ($Verify -match "(?ms)import\s+(?:type\s+)?\{[^}]*\bany\b[^}]*\bany\b[^}]*\}") {
    throw "Malformed any/any import still present."
}

if ($Verify -match "(?m)^\s*(?:\}\s*)?from\s*;\s*$") {
    throw "Orphan 'from ;' syntax still present."
}

if ($Verify -match "\bVercelRequest\b|\bVercelResponse\b") {
    throw "Vercel request/response symbols still present."
}

Write-Host "PASS: diagnose source validation clean." -ForegroundColor Green

Write-Host "[5/7] First 25 lines after repair..." -ForegroundColor Yellow

Get-Content $Diagnose -TotalCount 25

Write-Host "[6/7] Backend TypeScript..." -ForegroundColor Yellow

Set-Location $Backend
npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "TypeScript failed. Backup:" -ForegroundColor Red
    Write-Host $Backup -ForegroundColor Red
    throw "Backend TypeScript failed."
}

Write-Host "PASS: backend TypeScript clean." -ForegroundColor Green

Write-Host "[7/7] Backend production build..." -ForegroundColor Yellow

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Production build failed. Backup:" -ForegroundColor Red
    Write-Host $Backup -ForegroundColor Red
    throw "Backend production build failed."
}

Write-Host ""
Write-Host "PASS: Backend Phase 22.3.6 Diagnose Surgical Fix complete." -ForegroundColor Green
Write-Host "Safe to commit and push."
