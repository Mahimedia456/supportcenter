$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Vercel Production Diagnostic Fix" -ForegroundColor Cyan

$Backend = $PSScriptRoot

if (-not (Test-Path (Join-Path $Backend "src\app.module.ts"))) {
    throw "Run from E:\Supportcenter\backend after merging ZIP."
}

Set-Location $Backend

Write-Host "[1/4] Ensuring production diagnostic dependencies..." -ForegroundColor Yellow
npm install --save-dev @types/express
if ($LASTEXITCODE -ne 0) {
    throw "@types/express install failed."
}

Write-Host "[2/4] Backend TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[3/4] Verifying Vercel files..." -ForegroundColor Yellow
$files = @(
    "api\index.ts",
    "api\health.ts",
    "api\diagnose.ts",
    "vercel.json"
)

foreach ($file in $files) {
    if (-not (Test-Path (Join-Path $Backend $file))) {
        throw "Missing: $file"
    }
}

Write-Host "[4/4] Ready." -ForegroundColor Green

Write-Host ""
Write-Host "PASS: Vercel production diagnostic fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "After push + redeploy test:"
Write-Host "  https://supportcenter-kappa.vercel.app/"
Write-Host "  https://supportcenter-kappa.vercel.app/health"
Write-Host "  https://supportcenter-kappa.vercel.app/api/health"
Write-Host "  https://supportcenter-kappa.vercel.app/api/diagnose"
Write-Host ""
Write-Host "Do NOT add PORT on Vercel."
