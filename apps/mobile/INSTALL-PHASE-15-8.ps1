$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 15.8 Brand Asset + Vercel Fix" -ForegroundColor Cyan

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) { throw "Mobile path not found: $Mobile" }
if (-not (Test-Path $Backend)) { throw "Backend path not found: $Backend" }

Write-Host "[1/7] Installing backend Express typings..." -ForegroundColor Yellow
Set-Location $Backend

npm install --save-dev @types/express
if ($LASTEXITCODE -ne 0) {
    throw "@types/express installation failed."
}

Write-Host "[2/7] Removing obsolete cropped/circle brand assets..." -ForegroundColor Yellow

$OldAssets = @(
    (Join-Path $Mobile "assets\final\support-command-center-brand.png"),
    (Join-Path $Mobile "assets\final\support-command-center-splash.png"),
    (Join-Path $Mobile "assets\final\support-command-center-login-reference.png"),
    (Join-Path $Mobile "assets\brand\final\support-command-center-brand-crop.png")
)

foreach ($File in $OldAssets) {
    if (Test-Path $File) {
        Remove-Item $File -Force
        Write-Host "Removed: $File" -ForegroundColor DarkGray
    }
}

Write-Host "[3/7] Verifying new same-theme brand assets..." -ForegroundColor Yellow

$Logo = Join-Path $Mobile "assets\brand\final\support-command-center-logo-transparent.png"
$Mark = Join-Path $Mobile "assets\brand\final\support-command-center-mark.png"

if (-not (Test-Path $Logo)) { throw "New transparent logo missing." }
if (-not (Test-Path $Mark)) { throw "New brand mark missing." }

Write-Host "PASS: new green/cyan/lime brand assets present." -ForegroundColor Green

Write-Host "[4/7] Verifying login/splash still point to current full transparent logo..." -ForegroundColor Yellow

$Login = Join-Path $Mobile "src\app\(auth)\login.tsx"

if (Test-Path $Login) {
    $LoginText = Get-Content $Login -Raw

    # Keep UI untouched; only normalize logo path if an old final asset path is still used.
    $LoginText = $LoginText `
        -replace "assets/final/support-command-center-brand\.png", "assets/brand/final/support-command-center-logo-transparent.png" `
        -replace "assets/final/support-command-center-splash\.png", "assets/brand/final/support-command-center-logo-transparent.png"

    Set-Content $Login -Value $LoginText -Encoding UTF8
}

Write-Host "[5/7] Backend TypeScript check..." -ForegroundColor Yellow
Set-Location $Backend
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[6/7] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[7/7] Vercel entry verification..." -ForegroundColor Yellow
$ApiEntry = Join-Path $Backend "api\index.ts"
$ApiText = Get-Content $ApiEntry -Raw

if ($ApiText -match "app\.set\(") {
    throw "Invalid app.set() is still present in Vercel entry."
}

if ($ApiText -notmatch "server\.set\('trust proxy'") {
    throw "Express trust proxy fix missing."
}

Write-Host ""
Write-Host "PASS: Phase 15.8 brand + Vercel fix complete." -ForegroundColor Green
Write-Host ""
Write-Host "Vercel: redeploy backend after committing/pushing this patch."
Write-Host "Mobile UI design/layout is unchanged; only brand assets were replaced."
