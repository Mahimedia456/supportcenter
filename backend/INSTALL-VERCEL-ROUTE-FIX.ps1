$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Vercel Route Compatibility Fix" -ForegroundColor Cyan

$Backend = $PSScriptRoot

if (-not (Test-Path (Join-Path $Backend "src\app.module.ts"))) {
    throw "Merge this ZIP into E:\Supportcenter and run from backend."
}

Set-Location $Backend

Write-Host "[1/4] Ensuring Express typings..." -ForegroundColor Yellow
npm install --save-dev @types/express
if ($LASTEXITCODE -ne 0) {
    throw "@types/express install failed."
}

Write-Host "[2/4] TypeScript check..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[3/4] Vercel route files..." -ForegroundColor Yellow
$required = @(
    (Join-Path $Backend "api\index.ts"),
    (Join-Path $Backend "api\health.ts"),
    (Join-Path $Backend "vercel.json")
)

foreach ($file in $required) {
    if (-not (Test-Path $file)) {
        throw "Missing: $file"
    }
}

Write-Host "[4/4] Done." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Vercel route compatibility fix installed." -ForegroundColor Green
Write-Host ""
Write-Host "Remove PORT from Vercel env if you added it; it is not required."
Write-Host ""
Write-Host "After deploy test all 3:"
Write-Host "  https://YOUR-PROJECT.vercel.app/"
Write-Host "  https://YOUR-PROJECT.vercel.app/health"
Write-Host "  https://YOUR-PROJECT.vercel.app/api/health"
Write-Host ""
Write-Host "Mobile base URL must be:"
Write-Host "  EXPO_PUBLIC_API_BASE_URL=https://YOUR-PROJECT.vercel.app"
