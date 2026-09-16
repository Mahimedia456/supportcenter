$ErrorActionPreference = "Stop"

Write-Host "Support Command Center Backend - Phase 22.3.7 Exact Diagnose Header Fix" -ForegroundColor Cyan

$Backend = $PSScriptRoot
$Diagnose = Join-Path $Backend "api\zendesk-diagnose.ts"

if (-not (Test-Path $Diagnose)) {
    throw "Missing api\zendesk-diagnose.ts"
}

Write-Host "[1/6] Creating backup..." -ForegroundColor Yellow

$Backup = "$Diagnose.phase2237.bak"
Copy-Item $Diagnose $Backup -Force

Write-Host "PASS: backup created." -ForegroundColor Green

Write-Host "[2/6] Removing exact corrupted header..." -ForegroundColor Yellow

$Lines = Get-Content $Diagnose

$StartIndex = -1

for ($i = 0; $i -lt $Lines.Count; $i++) {
    if ($Lines[$i] -match '^\s*function\s+clean\s*\(') {
        $StartIndex = $i
        break
    }
}

if ($StartIndex -lt 0) {
    throw "Could not find 'function clean(' in zendesk-diagnose.ts"
}

$FixedLines = $Lines[$StartIndex..($Lines.Count - 1)]

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines(
    $Diagnose,
    $FixedLines,
    $Utf8NoBom
)

Write-Host "PASS: corrupt import header removed." -ForegroundColor Green

Write-Host "[3/6] Verifying file header..." -ForegroundColor Yellow

$FirstLines = Get-Content $Diagnose -TotalCount 8
$FirstLine = $FirstLines[0]

if ($FirstLine -notmatch '^\s*function\s+clean\s*\(') {
    throw "First line is not function clean()."
}

$VerifyText = [System.IO.File]::ReadAllText($Diagnose)

if ($VerifyText -match '@vercel/node') {
    throw "@vercel/node still present."
}

if ($VerifyText -match '\bVercelRequest\b|\bVercelResponse\b') {
    throw "Vercel request/response type symbols still present."
}

if ($VerifyText -match '(?ms)^\s*import\s*\{\s*any\s*,\s*any') {
    throw "Corrupt any/any import still present."
}

Write-Host "PASS: diagnose header is clean." -ForegroundColor Green

Write-Host "[4/6] Showing repaired first 12 lines..." -ForegroundColor Yellow

Get-Content $Diagnose -TotalCount 12

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
Write-Host "PASS: Backend Phase 22.3.7 Exact Diagnose Header Fix complete." -ForegroundColor Green
Write-Host "Safe to commit and push."
