$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Backend Vercel Setup" -ForegroundColor Cyan

$Backend = $PSScriptRoot

if (-not (Test-Path (Join-Path $Backend "src\app.module.ts"))) {
    throw "Run this installer from E:\Supportcenter\backend after merging the ZIP."
}

Set-Location $Backend

Write-Host "[1/5] Verifying serverless entry..." -ForegroundColor Yellow
$ApiEntry = Join-Path $Backend "api\index.ts"
if (-not (Test-Path $ApiEntry)) {
    throw "Missing api\index.ts"
}

Write-Host "[2/5] Verifying Vercel config..." -ForegroundColor Yellow
$VercelJson = Join-Path $Backend "vercel.json"
if (-not (Test-Path $VercelJson)) {
    throw "Missing vercel.json"
}

Get-Content $VercelJson -Raw | ConvertFrom-Json | Out-Null

Write-Host "[3/5] Backend TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[4/5] Existing local health reminder..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod `
        -Uri "http://127.0.0.1:3000/health" `
        -Method GET `
        -TimeoutSec 3

    Write-Host "Local backend is responding." -ForegroundColor Green
}
catch {
    Write-Host "Local backend is not currently running. This does not block Vercel deployment." -ForegroundColor DarkYellow
}

Write-Host "[5/5] Vercel package ready." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Backend Vercel setup verified." -ForegroundColor Green
Write-Host ""
Write-Host "Deploy E:\Supportcenter\backend as the Vercel project root."
Write-Host "Add backend secrets under Vercel > Project > Settings > Environment Variables."
Write-Host ""
Write-Host "After deployment test:"
Write-Host "  Invoke-RestMethod https://YOUR-PROJECT.vercel.app/health"
Write-Host ""
Write-Host "Then update mobile .env:"
Write-Host "  EXPO_PUBLIC_API_BASE_URL=https://YOUR-PROJECT.vercel.app"
Write-Host ""
Write-Host "Restart Expo:"
Write-Host "  npx expo start -c"
