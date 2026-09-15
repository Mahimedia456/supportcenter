$ErrorActionPreference = "Stop"

Write-Host "Support Command Center - Phase 18.1 Installer Fix" -ForegroundColor Cyan
Write-Host "Fixes PowerShell/node -e quoting and completes Phase 18 verification."

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Mobile = Join-Path $Root "apps\mobile"
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Mobile)) {
    throw "Mobile path not found: $Mobile"
}

if (-not (Test-Path $Backend)) {
    throw "Backend path not found: $Backend"
}

$Sql = Join-Path $Backend "PHASE_18_ZENDESK_OAUTH.sql"
$Runner = Join-Path $Backend "tools\apply-phase18-zendesk-oauth.cjs"

if (-not (Test-Path $Sql)) {
    throw "Phase 18 SQL file missing. Merge Phase 18 first: $Sql"
}

if (-not (Test-Path $Runner)) {
    throw "OAuth migration runner missing: $Runner"
}

Write-Host "[1/7] Applying Zendesk OAuth token table..." -ForegroundColor Yellow
Set-Location $Backend

node ".\tools\apply-phase18-zendesk-oauth.cjs"

if ($LASTEXITCODE -ne 0) {
    throw "OAuth schema migration failed."
}

Write-Host "[2/7] Backend TypeScript check..." -ForegroundColor Yellow

npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Backend TypeScript check failed."
}

Write-Host "[3/7] Verifying OAuth backend files..." -ForegroundColor Yellow

$OauthController = Join-Path $Backend "src\zendesk\zendesk-oauth.controller.ts"
$OauthService = Join-Path $Backend "src\zendesk\zendesk-oauth.service.ts"
$ZendeskService = Join-Path $Backend "src\zendesk\zendesk.service.ts"

foreach ($File in @($OauthController, $OauthService, $ZendeskService)) {
    if (-not (Test-Path $File)) {
        throw "Missing Phase 18 backend file: $File"
    }
}

$ServiceText = Get-Content $ZendeskService -Raw

if ($ServiceText -notmatch "oauth\.accessToken") {
    throw "Zendesk service is not using OAuth token resolution."
}

Write-Host "PASS: OAuth backend wiring present." -ForegroundColor Green

Write-Host "[4/7] Mobile TypeScript check..." -ForegroundColor Yellow
Set-Location $Mobile

npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    throw "Mobile TypeScript check failed."
}

Write-Host "[5/7] Verifying Home All filter..." -ForegroundColor Yellow

$Overview = Join-Path $Mobile "src\app\(tabs)\index.tsx"
$OverviewText = Get-Content $Overview -Raw

if ($OverviewText -notmatch "label:\s*'All'") {
    throw "Home All period is missing."
}

Write-Host "PASS: Home All filter present." -ForegroundColor Green

Write-Host "[6/7] Verifying login keyboard scroll..." -ForegroundColor Yellow

$Login = Join-Path $Mobile "src\app\(auth)\login.tsx"
$LoginText = Get-Content $Login -Raw

if ($LoginText -notmatch "scrollToEnd") {
    throw "Login keyboard scroll fix is missing."
}

Write-Host "PASS: Login password keyboard scroll present." -ForegroundColor Green

Write-Host "[7/7] Phase 18.1 complete." -ForegroundColor Green
Write-Host ""
Write-Host "PASS: Phase 18 FINAL Zendesk OAuth installation is now complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next:"
Write-Host "  cd E:\Supportcenter"
Write-Host "  git add ."
Write-Host "  git commit -m `"Finalize Zendesk OAuth integration`""
Write-Host "  git push"
Write-Host ""
Write-Host "After Vercel redeploy open:"
Write-Host "  https://supportcenter-kappa.vercel.app/zendesk/oauth/atomos/start"
Write-Host ""
Write-Host "Then check:"
Write-Host "  https://supportcenter-kappa.vercel.app/zendesk/oauth/atomos/status"
