$ErrorActionPreference = "Stop"
$MobileDir = $PSScriptRoot
$RootDir = Resolve-Path (Join-Path $MobileDir "..\..")
$BackendDir = Join-Path $RootDir "backend"

function Invoke-Checked([string]$Label, [scriptblock]$Command) {
    Write-Host $Label -ForegroundColor Yellow
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Write-Host "Support Command Center - Phase 04 Stability Fix" -ForegroundColor Cyan
Write-Host "Fixing DB check, mobile theme type errors, and strict verification" -ForegroundColor Cyan

Set-Location $MobileDir
Invoke-Checked "[1/3] Mobile TypeScript check..." { npx tsc --noEmit }

Set-Location $BackendDir
Invoke-Checked "[2/3] Backend TypeScript check..." { npx tsc --noEmit }

Invoke-Checked "[3/3] Database connectivity check..." { npm run db:check }

Write-Host "" 
Write-Host "PASS: Phase 04 verification complete." -ForegroundColor Green
Write-Host "Run these as separate commands:" -ForegroundColor Cyan
Write-Host "cd E:\Supportcenter\backend"
Write-Host "npm run seed:phase02"
Write-Host "npm run start:dev"
Write-Host ""
Write-Host "Then in another PowerShell window:"
Write-Host "cd E:\Supportcenter\apps\mobile"
Write-Host "npm start"
